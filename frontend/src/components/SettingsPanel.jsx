
import React from 'react';
import { motion } from 'framer-motion';

const SettingsPanel = ({ settings, setSettings }) => {
  const resolutions = [
    { value: '3840x2160', label: '3840×2160 - 4K' },
    { value: '2560x1440', label: '2560×1440 - 2K' },
    { value: '1920x1080', label: '1920×1080 - Full HD' },
    { value: '1280x720', label: '1280×720 - HD' },
    { value: '854x480', label: '854×480 - SD' }
  ];
  
  const fpsOptions = [24, 30, 60];
  const backgrounds = ['Black', 'White', 'Transparent'];
  const formats = ['MP4', 'WEBM'];

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div 
      className="settings-panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="setting-group">
        <label>RESOLUTION</label>
        <select 
          value={settings.resolution}
          onChange={(e) => handleChange('resolution', e.target.value)}
          className="setting-select"
        >
          {resolutions.map(res => (
            <option key={res.value} value={res.value}>{res.label}</option>
          ))}
        </select>
      </div>

      <div className="setting-group">
        <label>FRAME RATE</label>
        <select
          value={settings.fps}
          onChange={(e) => handleChange('fps', Number(e.target.value))}
          className="setting-select"
        >
          {fpsOptions.map(fps => (
            <option key={fps} value={fps}>{fps} fps</option>
          ))}
        </select>
      </div>

      <div className="setting-group">
        <label>DURATION (SEC)</label>
        <input
          type="number"
          min="1"
          max="60"
          value={settings.duration}
          onChange={(e) => handleChange('duration', Number(e.target.value))}
          className="duration-input"
        />
        <span className="admin-note">ADMIN LIMIT: 60s</span>
      </div>

      <div className="setting-group">
        <label>BACKGROUND</label>
        <select
          value={settings.background}
          onChange={(e) => handleChange('background', e.target.value)}
          className="setting-select"
        >
          {backgrounds.map(bg => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>
      </div>

      <div className="setting-group">
        <label>EXPORT FORMAT</label>
        <select
          value={settings.format}
          onChange={(e) => handleChange('format', e.target.value)}
          className="setting-select"
        >
          {formats.map(format => (
            <option key={format} value={format}>{format}</option>
          ))}
        </select>
      </div>

      <div className="setting-group">
        <label>QUALITY</label>
        <div className="quality-slider">
          <input
            type="range"
            min="50"
            max="100"
            value={settings.quality}
            onChange={(e) => handleChange('quality', Number(e.target.value))}
            className="quality-range"
          />
          <span className="quality-label">
            {settings.quality}% - {(settings.quality * 0.5).toFixed(2)} Mbps
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsPanel;
