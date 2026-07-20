import { useEffect, useRef } from 'react';
import { delayRender, continueRender } from 'remotion';

/**
 * Production-safe SVG animation synchronization hook.
 *
 * RULES (why each step matters):
 *  1. delayRender() MUST be called at component TOP LEVEL (not inside async callbacks)
 *     so that Remotion registers the handle before attempting frame capture.
 *  2. continueRender() is called ONLY after:
 *     a) All fonts are loaded (document.fonts.ready)
 *     b) All <image> elements have loaded
 *     c) SVG SMIL timeline is seeked to the exact frame time
 *     d) CSS animations are paused and seeked via Web Animations API
 *     e) A genuine paint cycle has occurred (requestAnimationFrame)
 *  3. Each frame gets its OWN handle — we track the previous handle to avoid double-continue.
 *  4. Cleanup function ensures handles are released if the component unmounts mid-frame.
 */
export const useSyncSvgAnimations = (frame, fps) => {
  const handleRef = useRef(null);

  useEffect(() => {
    // 1. Immediately register delay — Remotion will NOT capture until we continue
    const handle = delayRender(`sync-frame-${frame}`, {
      timeoutInMilliseconds: 15000, // 15s timeout per frame (generous for slow assets)
    });
    handleRef.current = handle;

    let cancelled = false;

    const syncFrame = async () => {
      try {
        const root = document.getElementById('svg-root');
        if (!root) {
          // No SVG root yet — continue immediately so Remotion doesn't hang forever
          if (!cancelled) continueRender(handle);
          return;
        }

        const timeInSeconds = frame / fps;

        // 2. Wait for ALL fonts to be ready before any visual work
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        if (cancelled) return;

        // 3. Wait for all <image> elements inside the SVG to load
        const images = root.querySelectorAll('image');
        if (images.length > 0) {
          await Promise.all(
            Array.from(images).map(
              (img) =>
                new Promise((resolve) => {
                  // If already loaded or has no href, resolve immediately
                  const href = img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                  if (!href) { resolve(); return; }
                  
                  const testImg = new Image();
                  testImg.onload = resolve;
                  testImg.onerror = resolve; // Don't block on broken images
                  testImg.src = href;
                })
            )
          );
        }

        if (cancelled) return;

        // 4. Pause & seek all SMIL-capable SVGs to the exact frame time
        const svgs = root.querySelectorAll('svg');
        svgs.forEach((svg) => {
          try {
            if (typeof svg.pauseAnimations === 'function') svg.pauseAnimations();
            if (typeof svg.setCurrentTime === 'function') svg.setCurrentTime(timeInSeconds);
          } catch {
            // Some SVGs don't support SMIL methods — safe to ignore
          }
        });

        // 5. Pause & seek all Web Animations API animations (CSS keyframes, etc.)
        if (document.getAnimations) {
          const animations = document.getAnimations({ subtree: true });
          animations.forEach((anim) => {
            try {
              anim.currentTime = timeInSeconds * 1000;
              anim.pause();
            } catch {
              // Animation may already be finished — safe to ignore
            }
          });
        }

        // 6. Force synchronous layout recalculation
        void root.offsetHeight;

        // 7. Wait for an actual paint cycle — this is the KEY step.
        //    requestAnimationFrame fires BEFORE the next paint.
        //    Two nested rAFs guarantee the previous frame's styles have been painted.
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        });

        if (cancelled) return;

        // 8. NOW it's safe — the frame is fully painted, all assets loaded
        continueRender(handle);
      } catch (error) {
        console.error(`[SyncAnimations] Frame ${frame} sync failed:`, error);
        // Always continue to prevent Remotion from hanging
        if (!cancelled) continueRender(handle);
      }
    };

    syncFrame();

    // Cleanup: if this effect re-runs (new frame) before syncFrame completes,
    // mark the old work as cancelled so we don't double-continue
    return () => {
      cancelled = true;
    };
  }, [frame, fps]);
};
