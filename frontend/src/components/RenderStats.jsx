
import React from 'react';
import { motion } from 'framer-motion';

const RenderStats = ({ svgFile, settings, exportsUsed }) => {
  const stats = {
    frames: settings.duration * settings.fps,
    time: `${settings.duration}s`,
    size: svgFile ? `${(svgFile.size / 1024).toFixed(1)} KB` : '—',
    rate: `${settings.fps} FPS`
  };

  return (
    <motion.div 
      className="render-stats"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h4>RENDER STATS</h4>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">FRAMES</span>
          <span className="stat-value">{stats.frames}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">TIME</span>
          <span className="stat-value">{stats.time}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">SIZE</span>
          <span className="stat-value">{stats.size}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">RATE</span>
          <span className="stat-value">{stats.rate}</span>
        </div>
      </div>
      <div className="exports-used">
        <span>EXPORTS USED</span>
        <span className="exports-count">{exportsUsed}/5</span>
      </div>
    </motion.div>
  );
};

export default RenderStats;
