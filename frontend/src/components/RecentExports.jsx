
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

const RecentExports = ({ exports, onClear }) => {
  return (
    <div className="step-card">
      <div className="step-header">
        <span className="step-number">05</span>
        <h3>RECENT EXPORTS</h3>
        {exports.length > 0 && (
          <button className="clear-btn" onClick={onClear}>
            <X size={14} /> CLEAR
          </button>
        )}
      </div>
      <div className="recent-exports-list">
        <AnimatePresence>
          {exports.length === 0 ? (
            <div className="empty-exports">
              <span>No exports yet</span>
              <span className="sub-text">Render a video to see it here</span>
            </div>
          ) : (
            exports.map((exp, index) => (
              <motion.div
                key={exp.id}
                className="export-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="export-info">
                  <span className="export-name">{exp.name}</span>
                  <span className="export-details">
                    {exp.resolution} · {exp.duration}s
                  </span>
                </div>
                <div className="export-meta">
                  <span className="export-date">{exp.date}</span>
                  <span className="export-size">{exp.size} MB</span>
                  <button className="export-download-btn">
                    <Download size={14} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RecentExports;
