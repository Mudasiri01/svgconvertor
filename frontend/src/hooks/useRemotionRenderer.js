import { useState, useCallback, useRef } from 'react';
import { errorRecovery } from '../engine/errorRecovery';

/**
 * useRemotionRenderer — Playwright + FFmpeg rendering hook.
 *
 * Flow:
 *   1. POST /api/render  → returns { jobId }
 *   2. EventSource /api/render/progress/:jobId  → live SSE progress
 *   3. GET  /api/render/download/:jobId  → fetch MP4 blob
 *
 * Exports: renderVideo, generatePreview, renderStatus, progress, cancelRender
 */

const SERVER_BASE = import.meta.env.VITE_API_URL || '';
export const useRemotionRenderer = () => {
  const [renderStatus, setRenderStatus] = useState('idle');
  const [progress,     setProgress]     = useState(0);
  const [renderLog,    setRenderLog]    = useState([]);

  const abortControllerRef = useRef(null);
  const eventSourceRef     = useRef(null);
  const currentJobIdRef    = useRef(null);

  // ── Internal: append to render log ────────────────────────────────────
  const log = useCallback((msg) => {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log('[AuraRender]', entry);
    setRenderLog(prev => [...prev.slice(-199), entry]);
  }, []);

  // ── Cancel render ──────────────────────────────────────────────────────
  const cancelRender = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    currentJobIdRef.current = null;
    setRenderStatus('idle');
    setProgress(0);
    log('Render cancelled by user.');
  }, [log]);

  // ── Main render function ───────────────────────────────────────────────
  const renderVideo = useCallback(
    ({ svgContent, settings, onProgress }) => {
      return new Promise((resolve, reject) => {
        // Reset error recovery
        errorRecovery.reset();

        // Validate SVG input
        try {
          errorRecovery.validateSvg(svgContent);
        } catch (validErr) {
          setRenderStatus('error');
          return reject(validErr);
        }

        setRenderStatus('rendering');
        setProgress(0);
        setRenderLog([]);

        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        log(`Starting render: ${settings.resolution} @ ${settings.fps}fps, ${settings.duration}s`);

        // ─ Step 1: POST to server to start the render job ───────────────
        fetch(`${SERVER_BASE}/api/render`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ svgContent, settings }),
          signal,
        })
          .then(res => {
            if (!res.ok) return res.json().then(d => { throw new Error(d.error || `Server error ${res.status}`); });
            return res.json();
          })
          .then(({ jobId }) => {
            if (!jobId) throw new Error('Server did not return a jobId.');
            currentJobIdRef.current = jobId;
            log(`Job created: ${jobId}`);

            // ─ Step 2: Open SSE stream for live progress ───────────────
            const es = new EventSource(`${SERVER_BASE}/api/render/progress/${jobId}`);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
              let data;
              try { data = JSON.parse(event.data); } catch (_) { return; }

              const {
                stage, frame, totalFrames, percent,
                etaSec, message, downloadReady, error,
              } = data;

              if (message) log(message);

              // Map server percent (0–100) to UI progress
              const uiPercent = Math.min(100, percent || 0);
              setProgress(uiPercent);
              if (onProgress) onProgress(uiPercent, { frame, totalFrames, etaSec, stage });

              if (stage === 'error') {
                es.close();
                eventSourceRef.current = null;
                setRenderStatus('error');
                reject(new Error(error || 'Render failed on server.'));
                return;
              }

              if (stage === 'done' && downloadReady) {
                es.close();
                eventSourceRef.current = null;

                log('Downloading MP4…');
                setRenderStatus('downloading');

                // ─ Step 3: Download the finished MP4 ──────────────────
                fetch(`${SERVER_BASE}/api/render/download/${jobId}`, { signal })
                  .then(dlRes => {
                    if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);
                    return dlRes.blob();
                  })
                  .then(blob => {
                    if (blob.size === 0) throw new Error('Server returned an empty MP4 file.');
                    setRenderStatus('completed');
                    setProgress(100);
                    log(`Render complete. File size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
                    resolve(blob);
                  })
                  .catch(err => {
                    if (err.name === 'AbortError') return; // cancelled
                    setRenderStatus('error');
                    reject(err);
                  });
              }
            };

            es.onerror = (err) => {
              // Only error if not already done
              if (renderStatus !== 'completed' && renderStatus !== 'downloading') {
                console.warn('[AuraRender] SSE connection error:', err);
                // Don't immediately fail — SSE may reconnect
              }
            };
          })
          .catch(err => {
            if (err.name === 'AbortError') {
              log('Render cancelled.');
              setRenderStatus('idle');
              return;
            }
            log(`Error: ${err.message}`);
            setRenderStatus('error');
            reject(err);
          });
      });
    },
    [log]
  );

  // ── Generate preview (browser-side, unchanged) ─────────────────────────
  const generatePreview = useCallback(async (canvas, svgData) => {
    if (!canvas || !svgData) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const elementToSerialize =
      svgData.svgElement || (svgData instanceof Element ? svgData : null);
    if (!elementToSerialize) return;

    const xml     = new XMLSerializer().serializeToString(elementToSerialize);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl  = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(svgUrl);
        resolve();
      };
      img.onerror = () => {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00d4ff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('✦ AURA SVG PREVIEW ERROR', canvas.width / 2, canvas.height / 2);
        URL.revokeObjectURL(svgUrl);
        resolve();
      };
      img.src = svgUrl;
    });
  }, []);

  return {
    renderVideo,
    generatePreview,
    cancelRender,
    renderStatus,
    progress,
    renderLog,
  };
};
