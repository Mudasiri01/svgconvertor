import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UploadArea from './components/UploadArea';
import SettingsPanel from './components/SettingsPanel';
import PreviewCanvas from './components/PreviewCanvas';
import ExportButton from './components/ExportButton';
import RenderStats from './components/RenderStats';
import RecentExports from './components/RecentExports';
import BillboardNews from './components/BillboardNews';
import HowItWorks from './components/HowItWorks';
import SvgPlayground from './pages/SvgPlayground';
import Login from './pages/Login';
import { useSvgParser } from './hooks/useSvgParser';
import { useRemotionRenderer } from './hooks/useRemotionRenderer';
import './styles/App.css';

const App = () => {
  // ── Auth State ─────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [user, setUser] = useState(null);

  // ── App State ──────────────────────────────────────────────────────────
  const [svgFile, setSvgFile]             = useState(null);
  const [svgContent, setSvgContent]       = useState(null);
  const [settings, setSettings]           = useState({
    resolution : '1920x1080',
    fps        : 30,
    duration   : 6,
    background : 'Black',
    format     : 'WEBM',
    quality    : 95,
    codec      : 'VP9',
  });
  const [renderProgress, setRenderProgress] = useState(0);
  const [isRendering, setIsRendering]       = useState(false);
  const [videoUrl, setVideoUrl]             = useState(null);
  const [exportsUsed, setExportsUsed]       = useState(0);
  const [recentExports, setRecentExports]   = useState([]);
  const [activePage, setActivePage]         = useState('converter'); // 'converter' | 'playground'
  const [renderDetails, setRenderDetails]   = useState({ frame: 0, totalFrames: 0, etaSec: null, stage: '' });

  const canvasRef = useRef(null);
  const { parseSvg, getAnimationData } = useSvgParser();
  const { renderVideo, generatePreview } = useRemotionRenderer();

  // ── Auth Verification ──────────────────────────────────────────────────
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('aura_token');
      const machineId = localStorage.getItem('aura_machine_id');

      if (!token || !machineId) {
        setIsVerifying(false);
        return;
      }

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://your-vercel-api.vercel.app/api';
        const response = await fetch(`${API_URL}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ machineId })
        });

        const data = await response.json();
        
        if (response.ok && data.valid) {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('aura_token');
          toast.error(data.error || 'Session expired. Please log in again.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        toast.error('Network error during session verification.');
      } finally {
        setIsVerifying(false);
      }
    };
    verifySession();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('aura_token');
    setIsAuthenticated(false);
    setUser(null);
    toast.info('Logged out successfully.');
  };

  // ── File Upload ────────────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (file) => {
    try {
      setSvgFile(file);
      const content = await file.text();
      setSvgContent(content);

      const parsedData    = await parseSvg(content);
      // generatePreview only needs canvas + parsedData
      await generatePreview(canvasRef.current, parsedData);

      toast.success('✅ SVG uploaded successfully!');
    } catch (error) {
      toast.error('❌ Failed to upload SVG: ' + error.message);
    }
  }, [parseSvg, generatePreview]);

  // ── Render ─────────────────────────────────────────────────────────────
  const handleRender = useCallback(async () => {
    if (!svgContent) {
      toast.warning('⚠️ Please upload an SVG first');
      return;
    }

    setIsRendering(true);
    setRenderProgress(0);
    // Clear previous video so the canvas is visible during rendering
    setVideoUrl(null);

    try {
      const videoBlob = await renderVideo({
        svgContent,
        settings,
        onProgress : (progress, details = {}) => {
          setRenderProgress(Math.round(progress));
          setRenderDetails({
            frame      : details.frame      || 0,
            totalFrames: details.totalFrames|| 0,
            etaSec     : details.etaSec     ?? null,
            stage      : details.stage      || '',
          });
        },
        canvas     : canvasRef.current,
      });

      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);

      setExportsUsed(prev => {
        const next = prev + 1;
        if (next >= 5) toast.info('🎯 Export limit reached! Upgrade for unlimited exports.');
        return next;
      });

      setRecentExports(prev => [{
        id         : Date.now(),
        name       : svgFile?.name || 'animation.svg',
        date       : new Date().toLocaleDateString(),
        time       : new Date().toLocaleTimeString(),
        size       : (videoBlob.size / (1024 * 1024)).toFixed(2),
        resolution : settings.resolution,
        duration   : settings.duration,
        fps        : settings.fps,
      }, ...prev].slice(0, 10));

      toast.success('✅ Video rendered successfully!');
    } catch (error) {
      console.error(error);
      toast.error('❌ Render failed: ' + error.message);
    } finally {
      setIsRendering(false);
      setRenderProgress(100);
      setRenderDetails({ frame: 0, totalFrames: 0, etaSec: null, stage: 'done' });
    }
  }, [svgContent, settings, renderVideo, svgFile]);

  // ── Download ───────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!videoUrl) return;
    const link = document.createElement('a');
    link.href     = videoUrl;
    link.download = `aura-animation-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('📥 Download started!');
  }, [videoUrl]);

  // ── Preset ────────────────────────────────────────────────────────────
  const handleApplyPreset = useCallback((preset) => {
    setSettings(prev => ({
      ...prev,
      resolution : preset.resolution || prev.resolution,
      fps        : preset.fps        || prev.fps,
      duration   : preset.duration   || prev.duration,
      format     : preset.format     || prev.format,
    }));
    toast.success(`✨ Applied ${preset.name} preset!`);
  }, []);

  // ── Clear Exports ─────────────────────────────────────────────────────
  const clearExports = useCallback(() => {
    setRecentExports([]);
    toast.info('🗑️ Recent exports cleared');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  if (isVerifying) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0a0a0f', color: '#00d4ff', flexDirection: 'column' }}>
        <span className="aura-icon" style={{ fontSize: '48px', marginBottom: '20px' }}>✦</span>
        <h2 style={{ letterSpacing: '4px' }}>VERIFYING LICENSE...</h2>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login onLoginSuccess={(userData) => {
          setUser(userData);
          setIsAuthenticated(true);
        }} />
        <ToastContainer theme="dark" toastStyle={{ background: 'rgba(26, 26, 46, 0.95)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '12px', backdropFilter: 'blur(10px)' }} />
      </>
    );
  }

  return (
    <div className="app-container">

      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo-section">
          <span className="aura-icon">✦</span>
          <h1 className="app-title">AURA</h1>
          <span className="app-subtitle">SVG · WEBM</span>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-btn ${activePage === 'playground' ? 'active' : ''}`}
            onClick={() => setActivePage('playground')}
          >
            ✦ SVG PLAYGROUND
          </button>
          <button
            className={`nav-btn ${activePage === 'converter' ? 'active' : ''}`}
            onClick={() => setActivePage('converter')}
          >
            🎬 CONVERTER
          </button>
          <button className="nav-btn" onClick={handleLogout}>LOGOUT</button>
        </nav>

        <div className="header-status">
          <span className="status-dot" />
          <span className="status-text">
            {isRendering ? '🎬 RENDERING...' : 'AURA ENGINE READY'}
          </span>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main">
        {/* ─ Playground page ─ */}
        {activePage === 'playground' && (
          <SvgPlayground onSwitchToUpload={() => setActivePage('converter')} />
        )}

        {/* ─ Converter page ─ */}
        {activePage === 'converter' && <div className="main-grid">

          {/* LEFT COLUMN */}
          <div className="left-column">

            {/* Step 01 – Upload */}
            <div className="step-card">
              <div className="step-header">
                <span className="step-number">01</span>
                <h3>UPLOAD SVG FILE</h3>
                <span className="step-badge">REQUIRED</span>
              </div>

              <UploadArea onFileUpload={handleFileUpload} />

              {svgFile && (
                <div className="file-info">
                  <span className="file-name">📄 {svgFile.name}</span>
                  <span className="file-size">{(svgFile.size / 1024).toFixed(1)} KB</span>
                  <button
                    className="file-remove"
                    onClick={() => { setSvgFile(null); setSvgContent(null); setVideoUrl(null); }}
                  >✕</button>
                </div>
              )}

              <RenderStats svgFile={svgFile} settings={settings} exportsUsed={exportsUsed} />

              <div className="features-badge">
                <span>🎨 CSS Keyframes</span>
                <span>✨ SMIL</span>
                <span>🔄 Transforms</span>
                <span>📝 Text Animations</span>
              </div>

              <div className="conversion-remaining">
                <span>Conversions Remaining</span>
                <span className="countdown">{Math.max(0, 5 - exportsUsed)}/5</span>
              </div>
            </div>

            {/* Billboard */}
            <BillboardNews />
          </div>

          {/* CENTER COLUMN */}
          <div className="center-column">

            {/* Step 02 – Settings */}
            <div className="step-card">
              <div className="step-header">
                <span className="step-number">02</span>
                <h3>RENDER SETTINGS</h3>
                <button
                  className="save-config-btn"
                  onClick={() => {
                    localStorage.setItem('auraConfig', JSON.stringify(settings));
                    toast.success('💾 Configuration saved!');
                  }}
                >💾 SAVE CONFIG</button>
              </div>

              <SettingsPanel
                settings={settings}
                setSettings={setSettings}
                onApplyPreset={handleApplyPreset}
              />

              {isRendering && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${renderProgress}%` }} />
                  </div>
                  <div className="progress-text">
                    <span>
                      {renderDetails.stage === 'encoding'
                        ? '⚙️ Encoding MP4 (H.264)…'
                        : renderDetails.stage === 'downloading'
                        ? '📥 Downloading…'
                        : '🎬 Capturing Frames…'}
                    </span>
                    <span>{renderProgress}%</span>
                  </div>
                  <div className="progress-details">
                    {renderDetails.totalFrames > 0 && (
                      <span>Frame: {renderDetails.frame}/{renderDetails.totalFrames}</span>
                    )}
                    <span>Resolution: {settings.resolution}</span>
                    <span>FPS: {settings.fps}</span>
                    <span>Duration: {settings.duration}s</span>
                    {renderDetails.etaSec != null && renderDetails.etaSec > 0 && (
                      <span>ETA: {renderDetails.etaSec}s</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 03 – Preview & Export */}
            <div className="step-card">
              <div className="step-header">
                <span className="step-number">03</span>
                <h3>PREVIEW &amp; EXPORT</h3>
                <span className="step-badge">
                  {videoUrl ? '✅ READY' : '⏳ PENDING'}
                </span>
              </div>

              <div className="preview-container">
                <PreviewCanvas ref={canvasRef} />
                {!svgContent && (
                  <div className="preview-placeholder">
                    <span>🎬 PREVIEW</span>
                    <span className="sub-text">Upload SVG to preview</span>
                  </div>
                )}
                {videoUrl && (
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    className="video-preview"
                    autoPlay
                    loop
                  />
                )}
              </div>

              <div className="export-actions">
                <ExportButton
                  onExport={handleRender}
                  isRendering={isRendering}
                  videoUrl={videoUrl}
                  onDownload={handleDownload}
                />
              </div>

              {videoUrl && (
                <div className="video-info">
                  <span>✅ Video Ready</span>
                  <span>📁 WEBM</span>
                  <span>⚡ {settings.fps} FPS</span>
                  <span>🎯 {settings.resolution}</span>
                  <span>⏱️ {settings.duration}s</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="right-column">

            {/* Step 04 – Save Config */}
            <div className="step-card">
              <div className="step-header">
                <span className="step-number">04</span>
                <h3>SAVE CONFIG</h3>
              </div>
              <div className="save-config-section">
                <button
                  className="save-preset-btn"
                  onClick={() => {
                    localStorage.setItem('auraConfig', JSON.stringify(settings));
                    toast.success('💾 Configuration saved!');
                  }}
                >💾 Save Current Settings</button>
                <button
                  className="load-preset-btn"
                  onClick={() => {
                    const saved = localStorage.getItem('auraConfig');
                    if (saved) {
                      setSettings(JSON.parse(saved));
                      toast.success('📂 Configuration loaded!');
                    } else {
                      toast.warning('No saved configuration found');
                    }
                  }}
                >📂 Load Saved Config</button>
              </div>
            </div>

            {/* Recent Exports */}
            <RecentExports exports={recentExports} onClear={clearExports} />

            {/* How It Works */}
            <HowItWorks />
          </div>
        </div>}
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <div className="footer-content">
          <span>⬆ UP TO 1920×1080 · 60FPS</span>
          <span>🎨 CSS ANIMATIONS · SMIL · TRANSFORMS</span>
          <span>⚡ AURA ENGINE READY</span>
          <span>🔄 SVG → WEBM CONVERSION</span>
          <span>♾️ UNLIMITED EXPORTS</span>
        </div>
        <div className="footer-bottom">
          <span>© 2024 AURA STUDIO · All rights reserved</span>
          <span>Made with ✦ by AURA Team</span>
        </div>
      </footer>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          background     : 'rgba(26, 26, 46, 0.95)',
          border         : '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius   : '12px',
          backdropFilter : 'blur(10px)',
        }}
      />
    </div>
  );
};

export default App;