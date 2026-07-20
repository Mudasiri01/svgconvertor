/**
 * Aura SVG Studio — Rendering Backend
 *
 * Pipeline:
 *   POST /api/render  →  Playwright captures PNG frames  →  FFmpeg H.264 encode  →  MP4 stream back
 *
 * GET /api/render/progress/:jobId  →  SSE stream for live progress updates
 */

'use strict';

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const os         = require('os');
const { execFile }   = require('child_process');
const { promisify }  = require('util');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath      = require('ffmpeg-static');
const { chromium }    = require('playwright');

const execFileAsync = promisify(execFile);

// Resolve FFmpeg path for Electron ASAR unpacked
let resolvedFfmpegPath = ffmpegPath;
if (resolvedFfmpegPath.includes('app.asar')) {
  resolvedFfmpegPath = resolvedFfmpegPath.replace('app.asar', 'app.asar.unpacked');
}

// ── Express setup ──────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// ── Job progress store (in-memory, SSE) ───────────────────────────────────
/** @type {Map<string, { clients: Set<Response>, data: object }>} */
const jobs = new Map();

function emitProgress(jobId, payload) {
  const job = jobs.get(jobId);
  if (!job) return;
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of job.clients) {
    try { client.write(msg); } catch (_) { job.clients.delete(client); }
  }
  job.data = { ...job.data, ...payload };
}

// ── SSE — GET /api/render/progress/:jobId ─────────────────────────────────
app.get('/api/render/progress/:jobId', (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  // If job doesn't exist yet, create a placeholder
  if (!jobs.has(jobId)) {
    jobs.set(jobId, { clients: new Set(), data: {} });
  }
  const job = jobs.get(jobId);
  job.clients.add(res);

  // Send current snapshot immediately
  if (Object.keys(job.data).length) {
    res.write(`data: ${JSON.stringify(job.data)}\n\n`);
  }

  req.on('close', () => {
    job.clients.delete(res);
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build the full HTML page that Playwright will load, embedding the SVG. */
function buildHtmlPage(svgContent, width, height, background) {
  const bgCss = background === 'Transparent'
    ? 'transparent'
    : background === 'White' ? '#ffffff' : '#0a0a1a';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: ${bgCss};
  }
  svg {
    width: ${width}px !important;
    height: ${height}px !important;
    display: block;
  }
</style>
</head>
<body>
${svgContent}
</body>
</html>`;
}

/** Wait for n milliseconds. */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** Parse resolution string "WxH" into { width, height }. */
function parseResolution(res) {
  const [w, h] = (res || '1920x1080').split('x').map(Number);
  return { width: w || 1920, height: h || 1080 };
}

// ── Core render function ───────────────────────────────────────────────────

/**
 * Render an SVG animation to MP4 using Playwright frame-capture + FFmpeg.
 *
 * @param {object}   opts
 * @param {string}   opts.jobId        - Unique job identifier
 * @param {string}   opts.svgContent   - Raw SVG string
 * @param {object}   opts.settings     - Render settings from the frontend
 * @returns {Promise<string>}           - Path to the output MP4 file
 */
async function renderSvgToMp4({ jobId, svgContent, settings }) {
  const { width, height } = parseResolution(settings.resolution);
  const fps         = Number(settings.fps)      || 30;
  const duration    = Number(settings.duration) || 6;
  const background  = settings.background       || 'Black';
  const totalFrames = Math.ceil(fps * duration);

  // ── Temp directories ──────────────────────────────────────────────────
  const tmpBase  = path.join(os.tmpdir(), `aura-render-${jobId}`);
  const frameDir = path.join(tmpBase, 'frames');
  fs.mkdirSync(frameDir, { recursive: true });

  const outputMp4 = path.join(tmpBase, 'output.mp4');

  emitProgress(jobId, {
    stage: 'init',
    frame: 0,
    totalFrames,
    percent: 0,
    message: 'Launching browser renderer…',
  });

  console.log(`[Job ${jobId}] Starting render: ${width}x${height} @ ${fps}fps, ${duration}s = ${totalFrames} frames`);

  // ── Launch Playwright ─────────────────────────────────────────────────
  let executablePath;
  if (__dirname.includes('app.asar')) {
    const browsersPath = path.join(process.resourcesPath, 'playwright-browsers');
    try {
      const items = fs.readdirSync(browsersPath);
      const chromiumDir = items.find(i => i.startsWith('chromium-'));
      if (chromiumDir) {
        const win64Path = path.join(browsersPath, chromiumDir, 'chrome-win64', 'chrome.exe');
        const win32Path = path.join(browsersPath, chromiumDir, 'chrome-win', 'chrome.exe');
        if (fs.existsSync(win64Path)) {
          executablePath = win64Path;
        } else {
          executablePath = win32Path;
        }
      }
    } catch (e) {
      console.warn("Could not find bundled chromium:", e);
    }
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath, // undefined in dev, uses playwright's default
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--allow-file-access-from-files',
      '--disable-features=VizDisplayCompositor',
    ],
  });

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Suppress console noise from the SVG page
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.warn(`[Page console error] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.warn(`[Page JS error] ${err.message}`);
  });

  const htmlContent = buildHtmlPage(svgContent, width, height, background);
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  // Give CSS keyframe animations a moment to initialize
  await sleep(200);

  // ── Inject animation-control script into the page ─────────────────────
  // This pauses ALL animations so we can scrub them deterministically.
  await page.evaluate(() => {
    // Pause SMIL animations
    const svgEl = document.querySelector('svg');
    if (svgEl && svgEl.pauseAnimations) svgEl.pauseAnimations();

    // Pause all Web Animations API animations
    if (document.getAnimations) {
      document.getAnimations().forEach(a => {
        try { a.pause(); } catch (_) {}
      });
    }
  });

  emitProgress(jobId, {
    stage: 'capturing',
    frame: 0,
    totalFrames,
    percent: 0,
    message: 'Capturing frames…',
  });

  const renderStartTime = Date.now();
  const MAX_FRAME_RETRIES = 3;

  // ── Frame capture loop ────────────────────────────────────────────────
  for (let f = 0; f < totalFrames; f++) {
    const timeSec = f / fps;
    const timeMs  = timeSec * 1000;

    let captured = false;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_FRAME_RETRIES; attempt++) {
      try {
        // Seek all animations to the current frame time
        await page.evaluate(({ timeSec, timeMs }) => {
          // ① SMIL
          const svgEl = document.querySelector('svg');
          if (svgEl) {
            if (svgEl.pauseAnimations) svgEl.pauseAnimations();
            if (svgEl.setCurrentTime) svgEl.setCurrentTime(timeSec);
          }

          // ② Web Animations API (CSS @keyframes, <animate> polyfills)
          if (document.getAnimations) {
            document.getAnimations().forEach(anim => {
              try {
                anim.currentTime = timeMs;
                anim.pause();
              } catch (_) {}
            });
          }

          // ③ GSAP global timeline
          if (window.gsap && window.gsap.globalTimeline) {
            window.gsap.globalTimeline.pause(timeSec);
          }

          // ④ Lottie
          if (window.lottie) {
            try { window.lottie.goToAndStop(timeMs, false); } catch (_) {}
          }

          // ⑤ anime.js
          if (window.anime && window.anime.running) {
            window.anime.running.forEach(a => {
              try { a.seek(timeMs); } catch (_) {}
            });
          }

          // Force layout flush
          void document.body.offsetHeight;
        }, { timeSec, timeMs });

        // Small settle time to let the browser repaint
        await sleep(16);

        const framePath = path.join(frameDir, `frame_${String(f).padStart(6, '0')}.png`);
        await page.screenshot({
          path: framePath,
          type: 'png',
          clip: { x: 0, y: 0, width, height },
          omitBackground: background === 'Transparent',
        });

        captured = true;
        break; // success — exit retry loop
      } catch (err) {
        lastError = err;
        console.warn(`[Job ${jobId}] Frame ${f} attempt ${attempt} failed: ${err.message}`);
        if (attempt < MAX_FRAME_RETRIES) await sleep(Math.pow(2, attempt) * 100);
      }
    }

    if (!captured) {
      // Write a blank/black frame so FFmpeg sequence is unbroken
      console.error(`[Job ${jobId}] Frame ${f} permanently failed after ${MAX_FRAME_RETRIES} retries: ${lastError?.message}`);
      // Duplicate previous frame if possible, else let FFmpeg handle the gap
      const prevPath = f > 0
        ? path.join(frameDir, `frame_${String(f - 1).padStart(6, '0')}.png`)
        : null;
      const framePath = path.join(frameDir, `frame_${String(f).padStart(6, '0')}.png`);
      if (prevPath && fs.existsSync(prevPath)) {
        fs.copyFileSync(prevPath, framePath);
      }
    }

    // ── Progress reporting ──────────────────────────────────────────────
    const elapsed     = (Date.now() - renderStartTime) / 1000;
    const framesLeft  = totalFrames - f - 1;
    const fpsActual   = (f + 1) / elapsed;
    const etaSec      = framesLeft / Math.max(fpsActual, 0.1);
    const percent     = Math.round(((f + 1) / totalFrames) * 85); // 0–85% for capture

    emitProgress(jobId, {
      stage:     'capturing',
      frame:     f + 1,
      totalFrames,
      percent,
      etaSec:    Math.round(etaSec),
      message:   `Captured frame ${f + 1}/${totalFrames}`,
    });

    if ((f + 1) % 10 === 0) {
      console.log(`[Job ${jobId}] Captured ${f + 1}/${totalFrames} frames (${percent}%)`);
    }
  }

  // ── Close browser ─────────────────────────────────────────────────────
  await browser.close();
  console.log(`[Job ${jobId}] All ${totalFrames} frames captured. Running FFmpeg…`);

  emitProgress(jobId, {
    stage:   'encoding',
    percent: 86,
    message: 'Encoding MP4 with FFmpeg (H.264)…',
  });

  // ── FFmpeg encode ─────────────────────────────────────────────────────
  const inputPattern = path.join(frameDir, 'frame_%06d.png');

  // Quality/preset mapping
  const qualityPreset = settings.quality || 'high';
  const crfMap   = { low: 32, medium: 26, high: 20, ultra: 16 };
  const crf      = crfMap[qualityPreset] ?? 20;
  const preset   = 'fast'; // balance between speed and quality

  const ffmpegArgs = [
    '-y',                          // overwrite output
    '-framerate',  String(fps),
    '-i',          inputPattern,
    '-c:v',        'libx264',
    '-preset',     preset,
    '-crf',        String(crf),
    '-pix_fmt',    'yuv420p',      // max compatibility
    '-movflags',   '+faststart',   // progressive download
    '-vf',         `scale=${width}:${height}:flags=lanczos`,
    outputMp4,
  ];

  console.log(`[Job ${jobId}] FFmpeg args:`, ffmpegArgs.join(' '));

  try {
    const { stdout, stderr } = await execFileAsync(resolvedFfmpegPath, ffmpegArgs, {
      maxBuffer: 100 * 1024 * 1024,
    });
    if (stderr) console.log(`[Job ${jobId}] FFmpeg stderr:`, stderr.slice(-1000));
  } catch (err) {
    throw new Error(`FFmpeg encoding failed: ${err.message}\n${err.stderr || ''}`);
  }

  emitProgress(jobId, {
    stage:   'cleanup',
    percent: 98,
    message: 'Cleaning up temporary frames…',
  });

  // ── Cleanup frame PNGs ────────────────────────────────────────────────
  try {
    const files = fs.readdirSync(frameDir);
    for (const f of files) fs.unlinkSync(path.join(frameDir, f));
    fs.rmdirSync(frameDir);
  } catch (err) {
    console.warn(`[Job ${jobId}] Cleanup warning:`, err.message);
  }

  emitProgress(jobId, {
    stage:   'done',
    percent: 100,
    message: 'Render complete!',
  });

  console.log(`[Job ${jobId}] Render complete → ${outputMp4}`);
  return outputMp4;
}

// ── POST /api/render ───────────────────────────────────────────────────────
app.post('/api/render', async (req, res) => {
  const { svgContent, settings } = req.body;

  if (!svgContent || typeof svgContent !== 'string') {
    return res.status(400).json({ error: 'svgContent is required and must be a string.' });
  }
  if (!svgContent.includes('<svg')) {
    return res.status(400).json({ error: 'Content does not contain a valid <svg> element.' });
  }
  if (svgContent.length > 15 * 1024 * 1024) {
    return res.status(400).json({ error: 'SVG exceeds 15MB size limit.' });
  }

  const jobId = uuidv4();

  // Register job immediately so SSE listeners can attach
  jobs.set(jobId, { clients: new Set(), data: {} });

  // Respond immediately with jobId so the client can connect to SSE
  res.json({ jobId });

  // Run render async — errors are emitted via SSE
  setImmediate(async () => {
    try {
      const mp4Path = await renderSvgToMp4({ jobId, svgContent, settings: settings || {} });

      // After render, hold the mp4 for download
      const job = jobs.get(jobId);
      if (job) job.mp4Path = mp4Path;

      emitProgress(jobId, { stage: 'done', percent: 100, downloadReady: true, message: 'Render complete!' });
    } catch (err) {
      console.error(`[Job ${jobId}] Fatal render error:`, err);
      emitProgress(jobId, { stage: 'error', error: err.message });
    }
  });
});

// ── GET /api/render/download/:jobId ───────────────────────────────────────
app.get('/api/render/download/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job || !job.mp4Path || !fs.existsSync(job.mp4Path)) {
    return res.status(404).json({ error: 'Render not found or not yet complete.' });
  }

  const stat = fs.statSync(job.mp4Path);
  res.setHeader('Content-Type',        'video/mp4');
  res.setHeader('Content-Length',      stat.size);
  res.setHeader('Content-Disposition', `attachment; filename="aura-animation-${req.params.jobId}.mp4"`);

  const stream = fs.createReadStream(job.mp4Path);
  stream.pipe(res);

  stream.on('close', () => {
    // Cleanup output file after download
    try {
      fs.unlinkSync(job.mp4Path);
      const tmpBase = path.dirname(job.mp4Path);
      if (fs.existsSync(tmpBase)) fs.rmdirSync(tmpBase, { recursive: true });
    } catch (_) {}
    jobs.delete(req.params.jobId);
  });
});

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    ffmpeg: ffmpegPath,
    time:   new Date().toISOString(),
  });
});

// ── Start server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Aura SVG Rendering Backend  — Playwright+FFmpeg ║');
  console.log(`║   Listening on http://localhost:${PORT}              ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`FFmpeg binary: ${resolvedFfmpegPath}`);
});

module.exports = app; // export for electron
