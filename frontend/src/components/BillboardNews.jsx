
import React from 'react';
import { motion } from 'framer-motion';

const BillboardNews = () => {
  const news = [
    '🎉 New: 4K Export Support',
    '⚡ Optimized Rendering Engine',
    '🎨 SMIL Animation Support',
    '📱 Mobile Responsive Update'
  ];

  return (
    <div className="step-card billboard-news">
      <div className="step-header">
        <span className="step-number">📰</span>
        <h3>BILLBOARD NEWS</h3>
      </div>
      <div className="news-container">
        <div className="news-list">
          {news.map((item, index) => (
            <div key={index} className="news-item">
              <span className="news-bullet">▸</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BillboardNews;
