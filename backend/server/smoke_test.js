/**
 * End-to-end pipeline smoke test.
 * Submits a simple animated SVG, polls SSE for progress,
 * then downloads the MP4 and reports its file size.
 */
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

// A simple SVG with a CSS animation (rotating circle) + SMIL animation
const SVG_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <style>
    @keyframes spin {
      from { transform: rotate(0deg); transform-origin: 200px 200px; }
      to   { transform: rotate(360deg); transform-origin: 200px 200px; }
    }
    .spinner { animation: spin 2s linear infinite; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.2; }
    }
    .pulser { animation: pulse 1s ease-in-out infinite; }
  </style>
  <rect width="400" height="400" fill="#0a0a1a"/>
  <!-- CSS-animated rotating rectangle -->
  <rect class="spinner" x="150" y="150" width="100" height="100" fill="none" stroke="#00d4ff" stroke-width="4" rx="8"/>
  <!-- SMIL animated circle -->
  <circle cx="200" cy="200" r="20" fill="#ff6b6b">
    <animate attributeName="r" from="20" to="60" dur="1s" repeatCount="indefinite" values="20;60;20" keyTimes="0;0.5;1"/>
  </circle>
  <!-- CSS-animated opacity text -->
  <text class="pulser" x="200" y="360" text-anchor="middle" fill="#00d4ff" font-size="20" font-family="Arial">AURA ENGINE</text>
</svg>`;

const SETTINGS = {
  resolution: '640x480',
  fps: 24,
  duration: 2,
  background: 'Black',
  quality: 'medium',
};

const SERVER = 'http://localhost:3001';

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = new URL(url);
    const req = http.request({
      hostname: opts.hostname,
      port: opts.port,
      path: opts.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let out = '';
      res.on('data', d => out += d);
      res.on('end', () => {
        try { resolve(JSON.parse(out)); }
        catch { resolve({ raw: out }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function listenSSE(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const req = http.request({
      hostname: opts.hostname,
      port: opts.port,
      path: opts.pathname,
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
    }, (res) => {
      let buf = '';
      res.on('data', chunk => {
        buf += chunk.toString();
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const { stage, percent, frame, totalFrames, message, error } = data;
              if (message) process.stdout.write(`\r  [${stage}] ${message} — ${percent}%  `);
              if (stage === 'done' && data.downloadReady) { req.destroy(); resolve(); }
              if (stage === 'error') { req.destroy(); reject(new Error(error)); }
            } catch (_) {}
          }
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const opts = new URL(url);
    http.get({ hostname: opts.hostname, port: opts.port, path: opts.pathname }, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

(async () => {
  console.log('🧪 Aura SVG → MP4 Pipeline Smoke Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n1️⃣  Submitting render job…');
  const t0 = Date.now();
  const { jobId, error: postErr } = await postJson(`${SERVER}/api/render`, {
    svgContent: SVG_CONTENT,
    settings: SETTINGS,
  });
  if (postErr || !jobId) { console.error('❌ Failed to create job:', postErr); process.exit(1); }
  console.log(`   Job ID: ${jobId}`);

  console.log('\n2️⃣  Waiting for render (SSE progress)…');
  await listenSSE(`${SERVER}/api/render/progress/${jobId}`);
  console.log('\n');

  console.log('3️⃣  Downloading MP4…');
  const outPath = path.join(__dirname, `smoke_test_output.mp4`);
  await downloadFile(`${SERVER}/api/render/download/${jobId}`, outPath);

  const size = fs.statSync(outPath).size;
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n✅ SUCCESS!`);
  console.log(`   File:    ${outPath}`);
  console.log(`   Size:    ${(size / 1024).toFixed(1)} KB`);
  console.log(`   Time:    ${elapsed}s`);
  console.log(`   Settings: ${SETTINGS.resolution} @ ${SETTINGS.fps}fps, ${SETTINGS.duration}s`);

  process.exit(0);
})().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
