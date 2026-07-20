import React from 'react';
import { motion } from 'framer-motion';

const PRESETS = {
  instagram: {
    name: 'Instagram Reel',
    resolution: '1080x1920',
    fps: 30,
    format: 'MP4',
    duration: 15,
    icon: '📱'
  },
  youtube: {
    name: 'YouTube Short',
    resolution: '1920x1080',
    fps: 60,
    format: 'MP4',
    duration: 60,
    icon: '▶️'
  },
  tiktok: {
    name: 'TikTok Video',
    resolution: '1080x1920',
    fps: 30,
    format: 'MP4',
    duration: 30,
    icon: '🎵'
  },
  twitter: {
    name: 'Twitter Card',
    resolution: '1280x720',
    fps: 24,
    format: 'WEBM',
    duration: 10,
    icon: '🐦'
  },
  linkedin: {
    name: 'LinkedIn Post',
    resolution: '1920x1080',
    fps: 30,
    format: 'MP4',
    duration: 30,
    icon: '💼'
  }
};

const PresetsPanel = ({ onApplyPreset }) => {
  return (
    <div className="presets-panel">
      <h4 className="presets-title">⚡ Quick Presets</h4>
      <div className="presets-grid">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <motion.div 
            key={key}
            className="preset-card"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onApplyPreset(preset)}
          >
            <div className="preset-icon">{preset.icon}</div>
            <h5 className="preset-name">{preset.name}</h5>
            <div className="preset-details">
              <span>{preset.resolution}</span>
              <span>{preset.fps}FPS</span>
              <span>{preset.duration}s</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PresetsPanel;