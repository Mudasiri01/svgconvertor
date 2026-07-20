
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RefreshCw, Code, Eye, Maximize2, Minimize2 } from 'lucide-react';

const SvgEditor = ({ onSvgChange, onRender, initialSvg }) => {
  const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="100%" height="100%" fill="#0a0a1a"/>
  
  <!-- Rotating Ring -->
  <circle cx="400" cy="300" r="150" fill="none" stroke="#00d4ff" stroke-width="4" animate="rotate" dur="5"/>
  
  <!-- Pulsing Circle -->
  <circle cx="400" cy="300" r="80" fill="#7c3aed" opacity="0.8" animate="scale" dur="3"/>
  
  <!-- Orbiting Dot -->
  <circle cx="400" cy="300" r="10" fill="#00ff88" animate="orbit" dur="4"/>
  
  <!-- Center Text -->
  <text x="400" y="310" text-anchor="middle" fill="#ffffff" font-size="24" font-weight="bold" animate="opacity" dur="2">
    AURA
  </text>
</svg>`;

  const [svgCode, setSvgCode] = useState(initialSvg || defaultSvg);
  const [isPreview, setIsPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const previewRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (isAnimating) {
      animateSVG();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnimating, svgCode]);

  const animateSVG = () => {
    if (!previewRef.current) return;
    
    const svgElement = previewRef.current.querySelector('svg');
    if (!svgElement) return;

    const animateElements = svgElement.querySelectorAll('[animate]');
    const duration = 5;
    const startTime = performance.now();

    const animate = (timestamp) => {
      const elapsed = (timestamp - startTime) / 1000;
      const progress = elapsed % duration;

      animateElements.forEach(el => {
        const animType = el.getAttribute('animate');
        const dur = parseFloat(el.getAttribute('dur')) || 2;
        const p = (progress % dur) / dur;

        // Required for SVG: make transform relative to element's own bounding box
        el.style.transformBox = 'fill-box';
        el.style.transformOrigin = 'center';

        switch(animType) {
          case 'rotate':
            el.style.transform = `rotate(${p * 360}deg)`;
            break;
          case 'scale':
            const scale = 0.5 + (0.5 * Math.sin(p * Math.PI * 2));
            el.style.transform = `scale(${scale})`;
            break;
          case 'opacity':
            el.style.opacity = 0.3 + (0.7 * Math.sin(p * Math.PI * 2));
            break;
          case 'orbit':
            const angle = p * Math.PI * 2;
            const radius = 120;
            const cx = 400;
            const cy = 300;
            el.setAttribute('cx', cx + radius * Math.cos(angle));
            el.setAttribute('cy', cy + radius * Math.sin(angle));
            break;
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleSvgChange = (value) => {
    setSvgCode(value);
    setError(null);
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(value, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        setError('Invalid SVG syntax');
        return;
      }
      onSvgChange(value);
    } catch (err) {
      setError('Error parsing SVG');
      console.error(err);
    }
  };

  const togglePreview = () => {
    setIsPreview(!isPreview);
  };

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
    if (isAnimating && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleRender = () => {
    if (svgCode && !error) {
      onRender(svgCode);
    }
  };

  return (
    <div className={`svg-editor ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="editor-header">
        <div className="editor-tabs">
          <button 
            className={`tab-btn ${isPreview ? 'active' : ''}`}
            onClick={togglePreview}
          >
            {isPreview ? <Eye size={16} /> : <Code size={16} />}
            {isPreview ? 'Preview' : 'Code'}
          </button>
          <button 
            className="tab-btn"
            onClick={toggleAnimation}
          >
            {isAnimating ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}
            {isAnimating ? 'Stop' : 'Play'}
          </button>
          <button 
            className="tab-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
        <button className="render-btn" onClick={handleRender}>
          🚀 Render 4K Video
        </button>
      </div>

      <div className="editor-content">
        <AnimatePresence mode="wait">
          {isPreview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="preview-container"
            >
              <div 
                ref={previewRef}
                className="svg-preview"
                dangerouslySetInnerHTML={{ __html: svgCode }}
              />
              {error && (
                <div className="editor-error">{error}</div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="code"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="code-container"
            >
              <textarea
                className="code-editor"
                value={svgCode}
                onChange={(e) => handleSvgChange(e.target.value)}
                spellCheck={false}
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#0a0a1a',
                  color: '#00d4ff',
                  border: 'none',
                  padding: '20px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: '1.6'
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SvgEditor;
