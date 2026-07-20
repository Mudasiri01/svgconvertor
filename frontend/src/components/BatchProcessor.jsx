
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, Download, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const BatchProcessor = ({ settings }) => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    const newFiles = uploadedFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      status: 'pending',
      progress: 0,
      error: null
    }));
    setFiles([...files, ...newFiles]);
  };

  const processBatch = async () => {
    setProcessing(true);
    setBatchProgress(0);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'processing' } : f
      ));
      
      try {
        // Simulate processing
        for (let p = 0; p <= 100; p += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, progress: p } : f
          ));
          setBatchProgress((i * 100 + p) / files.length);
        }
        
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'completed', progress: 100 } : f
        ));
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'error', error: error.message } : f
        ));
      }
    }
    
    setProcessing(false);
  };

  const removeFile = (id) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setBatchProgress(0);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle className="status-icon success" />;
      case 'processing': return <Loader className="status-icon processing spin" />;
      case 'error': return <AlertCircle className="status-icon error" />;
      default: return <File className="status-icon pending" />;
    }
  };

  return (
    <div className="batch-processor">
      <div className="batch-header">
        <div className="batch-stats">
          <span>📁 {files.length} files</span>
          <span>✅ {files.filter(f => f.status === 'completed').length} completed</span>
          <span>⏳ {files.filter(f => f.status === 'processing').length} processing</span>
        </div>
        <div className="batch-actions">
          <label className="upload-btn">
            <Upload size={16} /> Add Files
            <input 
              type="file"
              multiple
              accept=".svg"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          <button 
            className="process-btn"
            onClick={processBatch}
            disabled={processing || files.length === 0 || files.every(f => f.status === 'completed')}
          >
            {processing ? <Loader className="spin" size={16} /> : '🚀 Process All'}
          </button>
          <button 
            className="clear-btn"
            onClick={clearAll}
            disabled={processing}
          >
            <X size={16} /> Clear
          </button>
        </div>
      </div>

      {processing && (
        <div className="batch-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${batchProgress}%` }}
            />
          </div>
          <span className="progress-text">Overall Progress: {Math.round(batchProgress)}%</span>
        </div>
      )}

      <div className="file-list">
        <AnimatePresence>
          {files.map((file) => (
            <motion.div 
              key={file.id}
              className={`file-item ${file.status}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <div className="file-info">
                <div className="file-left">
                  {getStatusIcon(file.status)}
                  <span className="file-name">{file.name}</span>
                </div>
                <div className="file-right">
                  <span className="file-status-label">{file.status}</span>
                  {file.status === 'pending' && (
                    <button className="remove-btn" onClick={() => removeFile(file.id)}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              {file.status === 'processing' && (
                <div className="file-progress">
                  <div className="progress-bar small">
                    <div 
                      className="progress-fill"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}
              {file.status === 'error' && (
                <div className="file-error">{file.error}</div>
              )}
              {file.status === 'completed' && (
                <button className="download-single-btn">
                  <Download size={14} /> Download
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {files.length === 0 && (
        <div className="batch-empty">
          <Upload size={48} />
          <p>Drop SVG files here or click to upload</p>
          <span>Batch process multiple SVG files at once</span>
        </div>
      )}
    </div>
  );
};

export default BatchProcessor;
