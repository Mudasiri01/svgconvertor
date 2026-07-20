import { useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { parseSvgToReact } from './utils/svgParser.js';
import { useSyncSvgAnimations } from './utils/syncAnimations.js';

/**
 * Production-grade SVG Composition for Remotion.
 *
 * DESIGN DECISIONS:
 *  1. delayRender is called at TOP LEVEL via useSyncSvgAnimations — NOT in nested callbacks
 *  2. NO CSS animation-delay trick (it conflicts with baked inline styles from svgParser)
 *  3. All animation state is computed mathematically in svgParser.js based on frame/fps
 *  4. The CSS block only does layout sizing — no animation overrides
 *  5. SVG parsing is NOT memoized across frames because each frame produces different output
 */
export const SvgComposition = ({ svgCode, background }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const containerRef = useRef(null);

  // 1. Sync animations — this internally manages delayRender/continueRender
  //    with proper font loading, image loading, and paint-cycle waiting.
  useSyncSvgAnimations(frame, fps);

  // 2. Parse SVG to React nodes deterministically for this frame.
  //    parseSvgToReact() computes the EXACT visual state for this frame
  //    by mathematically computing transforms, opacity, etc. from progress.
  //    It removes SMIL elements and bakes all animation state into inline styles.
  const parsedSvg = parseSvgToReact(svgCode, frame, fps, durationInFrames);

  // 3. Map background setting
  let bgColor = 'transparent';
  if (background === 'Black') bgColor = '#000000';
  if (background === 'White') bgColor = '#ffffff';

  return (
    <div
      id="svg-root"
      ref={containerRef}
      style={{
        flex: 1,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: bgColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          /* Layout sizing only — NO animation overrides.
             All animation state is baked into inline styles by svgParser.js.
             This avoids the conflict where CSS animation-delay competes with
             inline transform/opacity values. */
          #svg-root > div > svg,
          #svg-root > svg {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }

          /* Kill ALL browser-driven CSS animations and transitions.
             We handle animation state mathematically — browser animation engines
             introduce non-determinism that breaks frame-exact rendering. */
          #svg-root * {
            animation: none !important;
            transition: none !important;
          }
        `}
      </style>
      {parsedSvg}
    </div>
  );
};
