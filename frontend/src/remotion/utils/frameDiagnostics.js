import { useEffect, useRef } from 'react';

/**
 * Frame Diagnostics — Per-component instance (NOT a global singleton).
 *
 * WHY THIS CHANGED:
 *  Previously, `diagnostics` was a global singleton shared across all Remotion
 *  render tabs. When Remotion renders frames in parallel across multiple Chrome tabs,
 *  each tab gets its own composition instance but they could share module-level state.
 *  This created a race condition where Tab 0's frame data would be compared against
 *  Tab 1's previous frame, producing false "stalled animation" warnings.
 *
 *  Now each component instance tracks its OWN state via useRef — no sharing.
 */

export const useDiagnostics = (frame) => {
  const prevFrameDataRef = useRef(null);
  const staticCountRef = useRef(0);
  const maxStaticThreshold = 120; // 2 seconds at 60fps

  useEffect(() => {
    const domElement = document.getElementById('svg-root');
    if (!domElement) return;

    const domState = domElement.innerHTML;

    if (prevFrameDataRef.current === domState && frame > 0) {
      staticCountRef.current++;
    } else {
      staticCountRef.current = 0;
    }

    prevFrameDataRef.current = domState;

    if (staticCountRef.current > maxStaticThreshold) {
      console.warn(
        `[Diagnostics] Warning: Animation appears stalled at frame ${frame}. ` +
        `${staticCountRef.current} identical frames detected. ` +
        `This may indicate svgParser.js is not computing different values per frame.`
      );
    }
  }, [frame]);
};
