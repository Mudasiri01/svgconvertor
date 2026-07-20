
import React, { forwardRef, useEffect, useRef } from 'react';

const PreviewCanvas = forwardRef((props, ref) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(canvasRef.current);
      } else {
        ref.current = canvasRef.current;
      }
    }
  }, [ref]);

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="preview-canvas"
        width="854"
        height="480"
      />
    </div>
  );
});

PreviewCanvas.displayName = 'PreviewCanvas';

export default PreviewCanvas;
