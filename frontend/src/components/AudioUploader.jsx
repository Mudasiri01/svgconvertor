
import React, { useState, useRef } from 'react';
import { Music, Play, Pause, X, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

const AudioUploader = ({ onAudioUpload, onAudioRemove }) => {
  const [audioFile, setAudioFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      onAudioUpload(file);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioUrl(null);
    setIsPlaying(false);
    onAudioRemove();
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  return (
    <div className="audio-uploader">
      {!audioFile ? (
        <div className="audio-dropzone">
          <Music className="audio-icon" />
          <p>Add Background Music</p>
          <span className="audio-subtext">MP3, WAV, AAC supported</span>
          <input 
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            style={{ display: 'none' }}
            id="audioInput"
          />
          <button 
            className="audio-upload-btn"
            onClick={() => document.getElementById('audioInput').click()}
          >
            <Upload size={16} /> Choose Audio File
          </button>
        </div>
      ) : (
        <motion.div 
          className="audio-controls"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <audio ref={audioRef} src={audioUrl} />
          <div className="audio-info">
            <Music className="audio-icon-small" />
            <span className="audio-filename">{audioFile.name}</span>
            <span className="audio-size">
              {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          <div className="audio-actions">
            <motion.button 
              className="audio-play-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={togglePlay}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </motion.button>
            <motion.button 
              className="audio-remove-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={removeAudio}
            >
              <X size={16} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AudioUploader;
