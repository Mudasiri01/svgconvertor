import { useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * A sophisticated hook to wrap GSAP animations deterministically in Remotion.
 * It forces the global GSAP timeline to exactly match the current Remotion frame,
 * preventing any real-time drift or asynchronous playhead issues.
 */
export const useGSAPTimeline = (gsapInstance, globalTimeline) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    if (gsapInstance && globalTimeline) {
        // Halt internal GSAP ticking
        gsapInstance.ticker.sleep();
        
        // Calculate deterministic time in seconds
        const timeInSeconds = frame / fps;
        
        // Seek exactly to the calculated time
        globalTimeline.seek(timeInSeconds, false);
    }
};

/**
 * A wrapper for Anime.js deterministic playback.
 */
export const useAnimeJsTimeline = (animeInstance, runningAnimations) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    if (animeInstance && runningAnimations) {
        const timeMs = (frame / fps) * 1000;
        
        runningAnimations.forEach(animation => {
            animation.pause(); // Ensure no real-time ticking
            animation.seek(timeMs);
        });
    }
};
