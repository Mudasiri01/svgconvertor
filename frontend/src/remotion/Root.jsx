import { Composition } from 'remotion';
import { SvgComposition } from './SvgComposition.jsx';

/**
 * Remotion Root — Registers all compositions.
 * 
 * NOTE: The actual width, height, fps, and duration are overridden by
 * the server renderer (renderer.js) at render time based on user settings.
 * The values here are just sensible defaults for development/preview.
 */
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="SvgVideo"
        component={SvgComposition}
        durationInFrames={360}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{
          svgCode: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0a0a1a"/></svg>',
          animations: [],
          background: 'Black',
        }}
      />
    </>
  );
};
