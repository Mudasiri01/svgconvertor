
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

const UploadArea = ({ onFileUpload }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
        onFileUpload(file);
      } else {
        toast.error('Please upload an SVG file');
      }
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/svg+xml': ['.svg'] },
    maxFiles: 1
  });

  return (
    <motion.div
      {...getRootProps()}
      className={`upload-area ${isDragActive ? 'drag-active' : ''}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <input {...getInputProps()} />
      <div className="upload-content">
        {isDragActive ? (
          <>
            <File className="upload-icon" />
            <p className="upload-text">Drop your SVG here</p>
            <span className="upload-subtext">or tap to browse files</span>
          </>
        ) : (
          <>
            <Upload className="upload-icon" />
            <p className="upload-text">DRAG & DROP OR CLICK</p>
            <span className="upload-subtext">Supported: .svg files</span>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default UploadArea;
