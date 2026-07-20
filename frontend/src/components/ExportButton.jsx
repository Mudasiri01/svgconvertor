
import React from 'react';
import { motion } from 'framer-motion';

const ExportButton = ({ onExport, isRendering, videoUrl, onDownload }) => {
  return (
    <div className="export-btn-group">
      <motion.button
        className="render-button"
        onClick={onExport}
        disabled={isRendering}
        whileHover={{ scale: isRendering ? 1 : 1.02 }}
        whileTap={{ scale: isRendering ? 1 : 0.98 }}
      >
        {isRendering ? (
          <span className="btn-inner">
            <span className="spinner" /> RENDERING...
          </span>
        ) : (
          '🎬 CONVERT TO VIDEO'
        )}
      </motion.button>

      {videoUrl && (
        <motion.button
          className="download-button"
          onClick={onDownload}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{ marginTop: '8px' }}
        >
          📥 DOWNLOAD VIDEO
        </motion.button>
      )}
    </div>
  );
};

export default ExportButton;
