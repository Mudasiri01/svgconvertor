import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, Code, Eye, Download, Maximize2, Minimize2,
  RefreshCw, Film, ChevronDown, ChevronUp, Clipboard, Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useRemotionRenderer } from '../hooks/useRemotionRenderer';

// ─── Sample Templates ───────────────────────────────────────────────────────
const TEMPLATES = [
  {
    name: '🌀 Cosmic Rings',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="100%" height="100%" fill="#0a0a1a"/>
  <circle cx="400" cy="300" r="200" fill="none" stroke="#00d4ff" stroke-width="2" opacity="0.3"/>
  <circle cx="400" cy="300" r="150" fill="none" stroke="#7c3aed" stroke-width="3" animate="rotate" dur="6"/>
  <circle cx="400" cy="300" r="100" fill="none" stroke="#00ff88" stroke-width="2" animate="rotate" dur="4"/>
  <circle cx="400" cy="300" r="60"  fill="#7c3aed" opacity="0.6" animate="scale" dur="3"/>
  <circle cx="400" cy="300" r="12"  fill="#00ff88" animate="orbit" dur="4"/>
  <circle cx="400" cy="300" r="8"   fill="#00d4ff" animate="orbit" dur="6"/>
  <text x="400" y="308" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="bold" font-family="Arial" animate="opacity" dur="2">AURA</text>
</svg>`,
  },
  {
    name: '⚡ Neon Pulse',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#00d4ff" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="#050510"/>
  <ellipse cx="400" cy="300" rx="250" ry="180" fill="url(#glow)" animate="scale" dur="2"/>
  <rect x="200" y="260" width="400" height="80" rx="40" fill="none" stroke="#00d4ff" stroke-width="3" animate="opacity" dur="1.5"/>
  <rect x="240" y="280" width="320" height="40" rx="20" fill="#00d4ff" opacity="0.15" animate="scale" dur="1.5"/>
  <text x="400" y="308" text-anchor="middle" fill="#00d4ff" font-size="28" font-weight="900" font-family="Arial" letter-spacing="8" animate="opacity" dur="2">NEON</text>
</svg>`,
  },
  {
    name: '🌊 Wave Flow',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="100%" height="100%" fill="#0a0a1a"/>
  <circle cx="400" cy="300" r="180" fill="none" stroke="#00d4ff" stroke-width="1" opacity="0.2"/>
  <circle cx="400" cy="300" r="140" fill="none" stroke="#7c3aed" stroke-width="1" opacity="0.3" animate="rotate" dur="8"/>
  <circle cx="400" cy="300" r="100" fill="none" stroke="#00ff88" stroke-width="2" opacity="0.4" animate="rotate" dur="5"/>
  <circle cx="400" cy="300" r="60"  fill="none" stroke="#00d4ff" stroke-width="3" animate="scale" dur="3"/>
  <circle cx="400" cy="300" r="20"  fill="#7c3aed" animate="scale" dur="2"/>
  <line x1="220" y1="300" x2="580" y2="300" stroke="#ffffff" stroke-width="1" opacity="0.1"/>
  <line x1="400" y1="120" x2="400" y2="480" stroke="#ffffff" stroke-width="1" opacity="0.1"/>
</svg>`,
  },
  {
    name: '✨ Star Burst',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="100%" height="100%" fill="#050510"/>
  <polygon points="400,100 430,270 600,270 460,370 510,540 400,430 290,540 340,370 200,270 370,270" fill="#7c3aed" opacity="0.7" animate="rotate" dur="10"/>
  <polygon points="400,150 422,250 520,250 445,310 472,410 400,350 328,410 355,310 280,250 378,250" fill="#00d4ff" opacity="0.5" animate="rotate" dur="7"/>
  <circle cx="400" cy="300" r="40" fill="#00ff88" opacity="0.9" animate="scale" dur="2"/>
  <circle cx="400" cy="300" r="20" fill="#ffffff" animate="opacity" dur="1.5"/>
</svg>`,
  },
  {
    name: '🔮 DNA Helix',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="100%" height="100%" fill="#0a0a1a"/>
  <ellipse cx="400" cy="300" rx="80" ry="200" fill="none" stroke="#00d4ff" stroke-width="3" animate="rotate" dur="4"/>
  <ellipse cx="400" cy="300" rx="80" ry="200" fill="none" stroke="#7c3aed" stroke-width="3" animate="rotate" dur="6"/>
  <circle cx="400" cy="100" r="15" fill="#00d4ff" animate="opacity" dur="2"/>
  <circle cx="400" cy="200" r="12" fill="#7c3aed" animate="opacity" dur="2"/>
  <circle cx="400" cy="300" r="18" fill="#00ff88" animate="scale" dur="3"/>
  <circle cx="400" cy="400" r="12" fill="#7c3aed" animate="opacity" dur="2"/>
  <circle cx="400" cy="500" r="15" fill="#00d4ff" animate="opacity" dur="2"/>
  <text x="400" y="308" text-anchor="middle" fill="#ffffff" font-size="14" font-family="Arial" opacity="0.6">HELIX</text>
</svg>`,
  },
];

// ─── Animation engine (runs inside the live preview DOM) ────────────────────
function runAnimation(svgEl, rafRef) {
  if (rafRef.current) cancelAnimationFrame(rafRef.current);
  const startTime = performance.now();

  const animate = (now) => {
    const elapsed = (now - startTime) / 1000;
    svgEl.querySelectorAll('[animate]').forEach((el) => {
      const type = el.getAttribute('animate');
      const dur  = parseFloat(el.getAttribute('dur')) || 2;
      const p    = (elapsed % dur) / dur;
      el.style.transformBox    = 'fill-box';
      el.style.transformOrigin = 'center';
      switch (type) {
        case 'rotate':
          el.style.transform = `rotate(${p * 360}deg)`;
          break;
        case 'scale': {
          const s = 0.7 + 0.3 * Math.sin(p * Math.PI * 2);
          el.style.transform = `scale(${s})`;
          break;
        }
        case 'opacity':
          el.style.opacity = 0.3 + 0.7 * Math.abs(Math.sin(p * Math.PI));
          break;
        case 'orbit': {
          const angle  = p * Math.PI * 2;
          const radius = 120;
          const cx     = parseFloat(svgEl.getAttribute('viewBox')?.split(' ')[2] || 800) / 2;
          const cy     = parseFloat(svgEl.getAttribute('viewBox')?.split(' ')[3] || 600) / 2;
          el.setAttribute('cx', cx + radius * Math.cos(angle));
          el.setAttribute('cy', cy + radius * Math.sin(angle));
          break;
        }
        default: break;
      }
    });
    rafRef.current = requestAnimationFrame(animate);
  };
  rafRef.current = requestAnimationFrame(animate);
}

// ── Component ────────────────────────────────────────────────────────────────
const SvgPlayground = ({ onSwitchToUpload }) => {
  const [svgCode, setSvgCode]           = useState(TEMPLATES[0].code);
  const [svgError, setSvgError]         = useState(null);
  const [isPlaying, setIsPlaying]       = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab]       = useState('split'); // 'code' | 'preview' | 'split'
  const [copied, setCopied]             = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [videoUrl, setVideoUrl]         = useState(null);
  const [isRendering, setIsRendering]   = useState(false);
  const [progress, setProgress]         = useState(0);
  const [settings, setSettings]         = useState({
    resolution : '3840x2160',
    fps        : 60,
    duration   : 6,
    background : 'Black',
    format     : 'mp4',
  });

  const previewRef  = useRef(null);
  const canvasRef   = useRef(null);
  const rafRef      = useRef(null);
  const { renderVideo } = useRemotionRenderer();

  // ── Live preview: inject SVG into DOM ───────────────────────────────────
  useEffect(() => {
    if (!previewRef.current) return;
    try {
      const parser  = new DOMParser();
      const doc     = parser.parseFromString(svgCode, 'image/svg+xml');
      const parseErr = doc.querySelector('parsererror');
      if (parseErr) { setSvgError('Invalid SVG syntax'); return; }
      setSvgError(null);

      // Replace children
      previewRef.current.innerHTML = '';
      const imported = document.importNode(doc.documentElement, true);
      imported.style.width  = '100%';
      imported.style.height = '100%';
      previewRef.current.appendChild(imported);

      if (isPlaying) runAnimation(imported, rafRef);
      else if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } catch (e) {
      setSvgError(e.message);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [svgCode, isPlaying]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCodeChange = (e) => setSvgCode(e.target.value);

  const handleTemplateSelect = (tpl) => {
    setSvgCode(tpl.code);
    setVideoUrl(null);
  };

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(svgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [svgCode]);

  const handleRender = useCallback(async () => {
    if (svgError) { toast.error('❌ Fix SVG errors before rendering'); return; }
    if (!canvasRef.current) { toast.error('❌ Canvas not ready'); return; }

    setIsRendering(true);
    setProgress(0);
    setVideoUrl(null);

    try {
      const blob = await renderVideo({
        svgContent : svgCode,
        settings,
        onProgress : (p) => setProgress(Math.round(p)),
        canvas     : canvasRef.current,
      });
      setVideoUrl(URL.createObjectURL(blob));
      toast.success('✅ Video rendered successfully!');
    } catch (err) {
      console.error(err);
      toast.error('❌ Render failed: ' + err.message);
    } finally {
      setIsRendering(false);
      setProgress(100);
    }
  }, [svgCode, svgError, settings, renderVideo]);

  const handleDownload = useCallback(() => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href     = videoUrl;
    a.download = `aura-playground-${Date.now()}.${settings.format}`;
    a.click();
    toast.success('📥 Download started!');
  }, [videoUrl, settings.format]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`playground-page ${isFullscreen ? 'pg-fullscreen' : ''}`}>

      {/* ── Top bar ── */}
      <div className="pg-topbar">
        <div className="pg-topbar-left">
          <span className="pg-badge">SVG PLAYGROUND</span>
          <span className="pg-hint">Edit code → live preview → render video</span>
        </div>

        {/* Template picker */}
        <div className="pg-templates">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              className={`pg-tpl-btn ${svgCode === t.code ? 'active' : ''}`}
              onClick={() => handleTemplateSelect(t)}
              title={t.name}
            >
              {t.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* View toggles */}
        <div className="pg-view-toggle">
          {['code', 'split', 'preview'].map((v) => (
            <button
              key={v}
              className={`pg-view-btn ${activeTab === v ? 'active' : ''}`}
              onClick={() => setActiveTab(v)}
            >
              {v === 'code' ? <Code size={14}/> : v === 'preview' ? <Eye size={14}/> : <><Code size={12}/><Eye size={12}/></>}
              <span>{v}</span>
            </button>
          ))}
          <button className="pg-view-btn" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
          </button>
        </div>
      </div>

      {/* ── Main workspace ── */}
      <div className={`pg-workspace ${activeTab}`}>

        {/* CODE PANE */}
        {(activeTab === 'code' || activeTab === 'split') && (
          <div className="pg-pane pg-code-pane">
            <div className="pg-pane-header">
              <span className="pg-pane-title"><Code size={13}/> SVG CODE</span>
              <div className="pg-pane-actions">
                {svgError && <span className="pg-error-badge">⚠ {svgError}</span>}
                <button className="pg-icon-btn" onClick={handleCopy} title="Copy code">
                  {copied ? <Check size={14}/> : <Clipboard size={14}/>}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="pg-editor-wrap">
              <div className="pg-line-numbers" aria-hidden="true">
                {svgCode.split('\n').map((_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
              <textarea
                className="pg-textarea"
                value={svgCode}
                onChange={handleCodeChange}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
          </div>
        )}

        {/* PREVIEW PANE */}
        {(activeTab === 'preview' || activeTab === 'split') && (
          <div className="pg-pane pg-preview-pane">
            <div className="pg-pane-header">
              <span className="pg-pane-title"><Eye size={13}/> LIVE PREVIEW</span>
              <div className="pg-pane-actions">
                <button
                  className={`pg-icon-btn ${isPlaying ? 'active' : ''}`}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying
                    ? <><Square size={13}/> Stop</>
                    : <><Play  size={13}/> Play</>}
                </button>
              </div>
            </div>

            <div className="pg-preview-area">
              <div className="pg-svg-stage" ref={previewRef} />
              {svgError && (
                <div className="pg-overlay-error">
                  <span>⚠</span>
                  <p>{svgError}</p>
                </div>
              )}
            </div>

            {/* ── Settings + Render panel ── */}
            <div className="pg-render-panel">
              <button
                className="pg-section-toggle"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Film size={13}/> RENDER TO VIDEO
                {showSettings ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
              </button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    className="pg-render-settings"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="pg-settings-row">
                      <div className="pg-setting">
                        <label>FORMAT</label>
                        <select
                          value={settings.format}
                          onChange={(e) => setSettings(s => ({ ...s, format: e.target.value }))}
                        >
                          <option value="mp4">MP4</option>
                          <option value="webm">WEBM</option>
                        </select>
                      </div>
                      <div className="pg-setting">
                        <label>RESOLUTION</label>
                        <select
                          value={settings.resolution}
                          onChange={(e) => setSettings(s => ({ ...s, resolution: e.target.value }))}
                        >
                          <option value="3840x2160">4K (3840×2160)</option>
                          <option value="1920x1080">Full HD (1920×1080)</option>
                          <option value="1280x720">HD (1280×720)</option>
                          <option value="854x480">SD (854×480)</option>
                        </select>
                      </div>
                      <div className="pg-setting">
                        <label>FPS</label>
                        <select
                          value={settings.fps}
                          onChange={(e) => setSettings(s => ({ ...s, fps: Number(e.target.value) }))}
                        >
                          <option value={24}>24 fps</option>
                          <option value={30}>30 fps</option>
                          <option value={60}>60 fps</option>
                        </select>
                      </div>
                      <div className="pg-setting">
                        <label>DURATION (s)</label>
                        <input
                          type="number" min={1} max={60}
                          value={settings.duration}
                          onChange={(e) => setSettings(s => ({ ...s, duration: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="pg-setting">
                        <label>BACKGROUND</label>
                        <select
                          value={settings.background}
                          onChange={(e) => setSettings(s => ({ ...s, background: e.target.value }))}
                        >
                          <option>Black</option>
                          <option>White</option>
                          <option>Transparent</option>
                        </select>
                      </div>
                    </div>

                    {/* Progress */}
                    {isRendering && (
                      <div className="pg-progress">
                        <div className="pg-progress-bar">
                          <motion.div
                            className="pg-progress-fill"
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: 'linear', duration: 0.3 }}
                          />
                        </div>
                        <div className="pg-progress-label">
                          <span>🎬 Rendering frames…</span>
                          <span>{progress}%</span>
                        </div>
                      </div>
                    )}

                    <div className="pg-render-actions">
                      <motion.button
                        className="pg-render-btn"
                        onClick={handleRender}
                        disabled={isRendering || !!svgError}
                        whileHover={{ scale: isRendering ? 1 : 1.02 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        {isRendering
                          ? <><span className="pg-spinner"/> RENDERING {progress}%</>
                          : <><Film size={15}/> RENDER VIDEO</>}
                      </motion.button>

                      {videoUrl && !isRendering && (
                        <motion.button
                          className="pg-download-btn"
                          onClick={handleDownload}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <Download size={15}/> DOWNLOAD .{settings.format.toUpperCase()}
                        </motion.button>
                      )}
                    </div>

                    {/* Video player */}
                    {videoUrl && !isRendering && (
                      <motion.div
                        className="pg-video-wrap"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <video key={videoUrl} src={videoUrl} controls autoPlay loop className="pg-video" />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hidden canvas for rendering */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SvgPlayground;
