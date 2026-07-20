/**
 * Web Worker implementation for chunked rendering in the browser.
 */
self.onmessage = async (e) => {
    const { action, payload } = e.data;

    if (action === 'START_RENDER') {
        try {
            // Distribute frame chunks to OffscreenCanvas or Remotion renderer
            const { startFrame, endFrame, fps } = payload;
            
            for (let i = startFrame; i <= endFrame; i++) {
                // Render exact frame logic...
                self.postMessage({ action: 'PROGRESS', frame: i });
            }

            self.postMessage({ action: 'COMPLETE', chunk: `${startFrame}-${endFrame}` });
        } catch (error) {
            self.postMessage({ action: 'ERROR', error: error.message });
        }
    }
};
