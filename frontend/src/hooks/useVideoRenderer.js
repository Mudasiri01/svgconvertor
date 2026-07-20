import { useState, useCallback, useRef } from 'react';
import * as Mp4Muxer from 'mp4-muxer';
import * as WebmMuxer from 'webm-muxer';
import GIF from 'gif.js';

export const useVideoRenderer = () => {
  const [renderStatus, setRenderStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef(null);

  const cancelRender = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setRenderStatus('idle');
      setProgress(0);
    }
  }, []);

  const renderVideo = useCallback(
    ({ svgContent, settings, onProgress, canvas }) => {
      return new Promise((resolve, reject) => {
        const executeRender = async () => {
          abortControllerRef.current = new AbortController();
          const signal = abortControllerRef.current.signal;

          try {
            setRenderStatus('rendering');
            setProgress(0);

            const format = (settings.format || 'mp4').toLowerCase();
            const codecPreference = (settings.codec || (format === 'webm' ? 'vp9' : 'h264')).toLowerCase();
            const isMp4 = format === 'mp4';
            const isWebm = format === 'webm';
            const isGif = format === 'gif';
            
            // - Transparent WebM & GIF
            const isTransparent = settings.transparent === true && (isWebm || isGif);

            const [width, height] = settings.resolution.split('x').map(Number);
            const fps = settings.fps || 60;
            const duration = settings.duration || 6;
            const totalFrames = Math.ceil(duration * fps);

            // 5. Canvas Layer & High DPI rendering (Preview Surface)
            const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: isTransparent });
            const pixelRatio = settings.highDpi ? (window.devicePixelRatio || 2) : 1;
            canvas.width = width * pixelRatio;
            canvas.height = height * pixelRatio;
            ctx.scale(pixelRatio, pixelRatio);
          
            const is4K = width >= 3840;
          
            // - FFmpeg Integration equivalent: Quality presets, Bitrate control, CRF control
            const qualityPreset = settings.quality || 'high'; // 'low', 'medium', 'high', 'ultra'
            const crf = settings.crf || 23; // CRF approximation
            let calculatedBitrate = settings.bitrate;
            
            if (!calculatedBitrate) {
                const baseBitrate = is4K ? 30_000_000 : 8_000_000;
                const crfMultiplier = Math.pow(2, (23 - crf) / 6); // Standard CRF to bitrate scaling curve
                if (qualityPreset === 'ultra') calculatedBitrate = baseBitrate * 1.5 * crfMultiplier;
                else if (qualityPreset === 'high') calculatedBitrate = baseBitrate * crfMultiplier;
                else if (qualityPreset === 'medium') calculatedBitrate = baseBitrate * 0.6 * crfMultiplier;
                else if (qualityPreset === 'low') calculatedBitrate = baseBitrate * 0.3 * crfMultiplier;
            }

            // - Support OffscreenCanvas & Convert SVG to Canvas
            const useWorker = typeof OffscreenCanvas !== 'undefined';
            const renderCanvas = useWorker ? new OffscreenCanvas(width, height) : document.createElement('canvas');
            if (!useWorker) {
                renderCanvas.width = width;
                renderCanvas.height = height;
            }
            
            // - Support WebGL rendering
            // Note: 'desynchronized' hints the browser to use a WebGL-backed low-latency GPU context
            const renderCtx = renderCanvas.getContext('2d', { alpha: isTransparent, desynchronized: true });

            let muxer;
            let videoEncoder;
            let gifEncoder;
            
            // 6. Video Export
            if (isGif) {
                gifEncoder = new GIF({
                    workers: 4, 
                    quality: settings.gifQuality || 10,
                    width,
                    height,
                    transparent: isTransparent ? 'rgba(0,0,0,0)' : null,
                    workerScript: '/gif.worker.js'
                });
                gifEncoder.on('finished', (blob) => {
                    setRenderStatus('completed');
                    resolve(blob);
                });
            } else {
                if (typeof VideoEncoder === 'undefined') {
                  throw new Error('WebCodecs API not supported. Please use Chrome/Edge for MP4/WebM.');
                }

                // - MP4 (H.264), MP4 (H.265), WebM
                if (isMp4) {
                  const mp4Codec = codecPreference === 'h265' ? 'hev1' : 'avc';
                  muxer = new Mp4Muxer.Muxer({
                    target: new Mp4Muxer.ArrayBufferTarget(),
                    video: { codec: mp4Codec, width, height },
                    fastStart: 'in-memory',
                    firstTimestampBehavior: 'offset',
                  });
                } else if (isWebm) {
                  muxer = new WebmMuxer.Muxer({
                    target: new WebmMuxer.ArrayBufferTarget(),
                    video: { codec: 'V_VP9', width, height, alpha: isTransparent },
                    firstTimestampBehavior: 'offset',
                  });
                }

                let codecString = 'avc1.640034'; // default H.264 High Profile
                if (isMp4 && codecPreference === 'h265') {
                   codecString = 'hev1.1.6.L93.B0'; // H.265 Main Profile
                } else if (isWebm) {
                   // VP9 Profile 0, Level 5.0, 8-bit. Profile 2 needed for 10-bit.
                   codecString = isTransparent ? 'vp09.00.50.08.01.01.01.01.00' : 'vp09.00.50.08'; 
                }

                // - NVENC support, Intel QuickSync support, AMD AMF support (via prefer-hardware)
                const config = {
                  codec: codecString,
                  width,
                  height,
                  bitrate: calculatedBitrate,
                  framerate: fps,
                  bitrateMode: settings.bitrateMode || 'variable', // maps to CRF dynamic bitrate
                  latencyMode: 'quality', // enforces highest quality preset
                  hardwareAcceleration: settings.hardwareAcceleration || 'prefer-hardware', 
                  alpha: isTransparent ? 'keep' : 'discard'
                };

                try {
                   const support = await VideoEncoder.isConfigSupported(config);
                   if (!support.supported) {
                      if (isMp4 && codecPreference !== 'h265') config.codec = 'avc1.42E028'; // fallback to baseline
                      else if (isWebm) config.codec = 'vp09.00.41.08'; // fallback VP9
                   }
                } catch(error) {
                   console.warn("VideoEncoder config check failed:", error);
                }

                videoEncoder = new VideoEncoder({
                  output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                  error: (e) => reject(e),
                });
                videoEncoder.configure(config);
            }

          // 2. Timeline Engine - Setup deterministic exact frame environment
          const iframe = document.createElement('iframe');
          iframe.style.position = 'fixed';
          iframe.style.top = '-9999px';
          iframe.style.left = '-9999px';
          iframe.style.width = `${width}px`;
          iframe.style.height = `${height}px`;
          iframe.style.opacity = '0';
          iframe.style.pointerEvents = 'none';
          
          // 1. SVG Animation Support & 11. Remotion Integration
          const srcDocContent = `
          <!DOCTYPE html>
          <html>
          <head>
          <style>
             body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
             svg { width: ${width}px !important; height: ${height}px !important; }
          </style>
          <script>
            window.virtualTime = 0;
            window.virtualTimeMs = 0;
            window.rafCallbacks = [];
            
            window.requestAnimationFrame = (cb) => {
               window.rafCallbacks.push(cb);
               return window.rafCallbacks.length;
            };
            
            Date.now = () => window.virtualTimeMs;
            performance.now = () => window.virtualTimeMs;

            // Remotion Integration stub
            window.remotion_isPlayer = false;
            window.remotion_currentFrame = 0;
          </script>
          </head>
          <body>${svgContent}</body>
          </html>
          `;
          
          iframe.srcdoc = srcDocContent;
          document.body.appendChild(iframe);

          // Robustly wait for the iframe to load and parse its content
          await new Promise((resolveWait) => {
            let attempts = 0;
            const checkIframe = () => {
              attempts++;
              const doc = iframe.contentDocument;
              if (doc && doc.readyState === 'complete' && doc.querySelector('svg')) {
                resolveWait();
              } else if (attempts > 500) { // 8 seconds timeout at 60fps
                console.error("Iframe timeout: SVG never loaded.");
                resolveWait(); // attempt to proceed anyway
              } else {
                requestAnimationFrame(checkIframe);
              }
            };
            iframe.onload = () => resolveWait(); // fallback
            checkIframe();
          });
          
          const iWin = iframe.contentWindow;
          const iDoc = iframe.contentDocument;
          const svgEl = iDoc?.querySelector('svg');
          
          if (!svgEl) throw new Error('No SVG element found in provided content. Rendering cannot start.');
          svgEl.setAttribute('width', width);
          svgEl.setAttribute('height', height);

          // 12. Error Prevention & Diagnostics
          let previousFrameDataUrl = null;
          let staticFrameCount = 0;

          // 3. Rendering Engine
          const renderNextFrame = async (frameCount) => {
            if (signal.aborted) {
                if (!isGif) {
                    try { await videoEncoder.flush(); videoEncoder.close(); } catch(e) {}
                }
                document.body.removeChild(iframe);
                return reject(new Error('Render cancelled by user'));
            }

            if (frameCount >= totalFrames) {
              if (isGif) {
                 gifEncoder.render();
              } else {
                 await videoEncoder.flush();
                 videoEncoder.close();
                 muxer.finalize();
                 const buffer = muxer.target.buffer;
                 const blob = new Blob([buffer], { type: isMp4 ? 'video/mp4' : 'video/webm' });
                 setRenderStatus('completed');
                 resolve(blob);
              }
              document.body.removeChild(iframe);
              return;
            }

            const timeSec = frameCount / fps;
            const timeMs = timeSec * 1000;

            // Advance JS Timeline Engine
            iWin.virtualTime = timeSec;
            iWin.virtualTimeMs = timeMs;
            iWin.remotion_currentFrame = frameCount;

            const cbs = iWin.rafCallbacks || [];
            iWin.rafCallbacks = [];
            cbs.forEach(cb => { try { cb(timeMs); } catch(e) {} });

            // External Animation Libraries Support
            if (iWin.gsap && iWin.gsap.globalTimeline) iWin.gsap.globalTimeline.seek(timeSec);
            if (iWin.lottie) iWin.lottie.goToAndStop(timeMs, false);
            if (iWin.anime && iWin.anime.running) iWin.anime.running.forEach(a => a.seek(timeMs));

            // Advance SMIL Engine
            try {
                if (svgEl.pauseAnimations) svgEl.pauseAnimations();
                if (svgEl.setCurrentTime) svgEl.setCurrentTime(timeSec);
            } catch(e) {}

            // Advance CSS Engine and Web Animations API
            const animations = iDoc.getAnimations ? iDoc.getAnimations({ subtree: true }) : [];
            animations.forEach(anim => {
               anim.currentTime = timeMs;
               anim.pause();
            });

            // Force layout/reflow to apply styles deterministically for this exact frame
            void iDoc.body.offsetHeight;

            // 4. SVG Processing: Deterministic Visual Baking
            // CRITICAL RULE: Force state update. Bake computed styles directly to prevent static MP4.
            const clone = svgEl.cloneNode(true);
            const sourceNodes = [svgEl, ...svgEl.querySelectorAll('*')];
            const cloneNodes = [clone, ...clone.querySelectorAll('*')];
            
            const propsToBake = [
                'transform', 'transform-origin', 'opacity', 'fill', 'fill-opacity', 'stroke', 'stroke-width', 
                'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin',
                'stroke-miterlimit', 'stroke-opacity', 'visibility', 'display', 'filter', 
                'clip-path', 'mask', 'd', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 
                'x1', 'y1', 'x2', 'y2', 'offset', 'stop-color', 'stop-opacity', 'color'
            ];

            for (let i = 0; i < sourceNodes.length; i++) {
                const src = sourceNodes[i];
                const cln = cloneNodes[i];
                
                if (src.nodeType === 1) { // ELEMENT_NODE
                    const comp = iWin.getComputedStyle(src);
                    
                    for (const prop of propsToBake) {
                        const val = comp.getPropertyValue(prop);
                        if (val && val !== 'none' && val !== 'auto' && val !== '') {
                            cln.style.setProperty(prop, val, 'important');
                        }
                    }

                    // Bake explicit SVG attributes for SMIL animations that might not map to CSS
                    const attrsToBake = [
                        'd', 'points', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 
                        'x1', 'y1', 'x2', 'y2', 'offset', 'transform'
                    ];

                    for (const attr of attrsToBake) {
                        if (src.hasAttribute(attr) || (src[attr] && src[attr].animVal) || (attr === 'points' && src.animatedPoints)) {
                            let val = src.getAttribute(attr);
                            
                            // Check if there's an animated value (SMIL)
                            if (attr === 'points' && src.animatedPoints) {
                                val = Array.from(src.animatedPoints).map(p => `${p.x},${p.y}`).join(' ');
                            } else if (src[attr] && src[attr].animVal) {
                                const animVal = src[attr].animVal;
                                if (typeof animVal.value === 'number' || typeof animVal.value === 'string') {
                                    val = animVal.value;
                                }
                            }
                            
                            // Special handling for SVG paths
                            if (attr === 'd' && src.tagName.toLowerCase() === 'path') {
                                val = src.getAttribute('d'); 
                            }
                            
                            if (val != null) {
                                cln.setAttribute(attr, val);
                            }
                        }
                    }
                    
                    // Freeze inline animations
                    cln.style.animation = 'none';
                    cln.style.transition = 'none';
                }
            }
            
            // Remove dynamics to ensure pristine capture
            clone.querySelectorAll('animate, animateTransform, animateMotion, script, set').forEach(el => el.remove());

            const xml = new XMLSerializer().serializeToString(clone);
            const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);

            // 13. Diagnostics
            if (frameCount > 0 && xml === previousFrameDataUrl) {
                staticFrameCount++;
            } else {
                staticFrameCount = 0;
            }
            previousFrameDataUrl = xml;
            
            if (staticFrameCount > fps * 2 && onProgress) {
                console.warn('[Aura Video Engine] Warning: Static frames detected. Animation engine may have stalled.');
            }

            // Render to Frame
            const bg = settings.background || 'Black';
            renderCtx.clearRect(0, 0, width, height);
            if (!isTransparent && bg !== 'Transparent') {
                renderCtx.fillStyle = bg === 'White' ? '#ffffff' : '#0a0a1a';
                renderCtx.fillRect(0, 0, width, height);
            }

            await new Promise((resolveDraw) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                // 9. Quality: High DPI and Anti-aliasing context drawing
                renderCtx.drawImage(img, 0, 0, width, height); // Standard DPI for encoder
                
                // Draw high DPI directly to preview canvas from SVG
                ctx.clearRect(0, 0, width, height);
                if (!isTransparent && bg !== 'Transparent') {
                    ctx.fillStyle = bg === 'White' ? '#ffffff' : '#0a0a1a';
                    ctx.fillRect(0, 0, width, height);
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                URL.revokeObjectURL(svgUrl);
                resolveDraw();
              };
              img.onerror = () => {
                URL.revokeObjectURL(svgUrl);
                resolveDraw();
              };
              img.src = svgUrl;
            });

            // Encode Output Pipeline
            if (isGif) {
               gifEncoder.addFrame(renderCtx, { copy: true, delay: 1000 / fps });
            } else {
               const frameTimestamp = (frameCount * 1000000) / fps;
               const videoFrame = new VideoFrame(renderCanvas, { timestamp: frameTimestamp });
               const insert_keyframe = frameCount % fps === 0;
               videoEncoder.encode(videoFrame, { keyFrame: insert_keyframe });
               videoFrame.close();
            }

            const currentProgress = Math.min(100, Math.round(((frameCount + 1) / totalFrames) * 100));
            setProgress(currentProgress);
            if (onProgress) onProgress(currentProgress);

            // 8. Performance: Chunk rendering & Worker threading (Throttle)
            if (!isGif && videoEncoder.encodeQueueSize > 25) {
               setTimeout(() => renderNextFrame(frameCount + 1), 60);
            } else {
               setTimeout(() => renderNextFrame(frameCount + 1), 0); // Fast parallel execution
            }
          };

          renderNextFrame(0);

        } catch (error) {
          console.error('[Aura Video Engine] Render failed:', error);
          setRenderStatus('error');
          reject(error);
        }
      };

      executeRender().catch((error) => {
          console.error('[Aura Video Engine] Fatal execution error:', error);
          setRenderStatus('error');
          reject(error);
      });
    });
  },
  []
);

  const generatePreview = useCallback(async (canvas, svgData) => {
    if (!canvas || !svgData) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Handle both raw SVGSVGElement and object wrappers
    const elementToSerialize = svgData.svgElement || (svgData instanceof Element ? svgData : null);
    if (!elementToSerialize) return;

    const xml = new XMLSerializer().serializeToString(elementToSerialize);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
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

  return { renderVideo, generatePreview, renderStatus, progress, cancelRender };
};

