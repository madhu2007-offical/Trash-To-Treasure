import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Check, RotateCcw, AlertCircle, RefreshCw, Smartphone, Image as ImageIcon } from 'lucide-react';
import { compressImageFile } from '../utils/imageUtils';
import './CameraModal.css';

export default function CameraModal({ isOpen, onClose, onCapture, title = "Capture Scrap Material Photo" }) {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mobileCameraRef = useRef(null);
  const galleryRef = useRef(null);

  // Check available cameras
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(videoInputs.length > 1);
    }).catch(() => {});
  }, []);

  // Stop active stream tracks safely
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start Camera Stream
  const startCamera = useCallback(async (mode = facingMode) => {
    setIsLoading(true);
    setCameraError(null);
    stopStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera is not supported on this browser. Use the device camera upload below.');
      setIsLoading(false);
      return;
    }

    try {
      let mediaStream;
      try {
        // Try requested facing mode first (back camera on mobile)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 960 }
          },
          audio: false
        });
      } catch {
        // Fallback to any available video stream (e.g. laptop webcam)
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsLoading(false);
    } catch (err) {
      console.warn('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings or use the system camera below.');
      } else {
        setCameraError('Could not start live camera. You can capture a photo using your device camera below.');
      }
      setIsLoading(false);
    }
  }, [facingMode, stopStream]);

  const handleClose = useCallback(() => {
    stopStream();
    setCapturedImage(null);
    onClose();
  }, [stopStream, onClose]);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  // Keep video ref connected to stream
  useEffect(() => {
    if (videoRef.current && stream && !capturedImage) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, capturedImage]);

  // Toggle front/back camera on mobile
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Snap photo from video frame
  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);
    stopStream();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Confirm photo
  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  // Fallback file input change
  const handleFallbackFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      if (compressed) {
        onCapture(compressed);
        handleClose();
      }
    } catch (err) {
      console.warn('File processing error:', err);
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="camera-modal-backdrop" onClick={handleClose}>
      <div className="camera-modal-dialog fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="camera-modal-header">
          <div className="camera-modal-title-group">
            <div className="camera-badge-icon">
              <Camera size={18} />
            </div>
            <h3>{title}</h3>
          </div>
          <button 
            type="button" 
            className="camera-modal-close" 
            onClick={handleClose}
            aria-label="Close camera"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Viewfinder Body */}
        <div className="camera-modal-body">
          {cameraError ? (
            <div className="camera-error-screen">
              <AlertCircle size={40} className="camera-error-icon" />
              <p>{cameraError}</p>
              <div className="camera-fallback-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-large camera-fallback-btn"
                  onClick={() => mobileCameraRef.current?.click()}
                >
                  <Smartphone size={18} />
                  <span>Snap with Mobile Camera</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-large"
                  onClick={() => galleryRef.current?.click()}
                >
                  <ImageIcon size={18} />
                  <span>Choose from Gallery</span>
                </button>
              </div>
              <input
                ref={mobileCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFallbackFileChange}
                style={{ display: 'none' }}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                onChange={handleFallbackFileChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : capturedImage ? (
            <div className="camera-preview-screen">
              <img src={capturedImage} alt="Captured scrap material" className="camera-captured-img" />
              <div className="camera-preview-tag">
                <Check size={14} />
                <span>Photo Captured</span>
              </div>
            </div>
          ) : (
            <div className="camera-viewfinder-container">
              {isLoading && (
                <div className="camera-loading-overlay">
                  <div className="camera-spinner"></div>
                  <span>Starting camera viewfinder...</span>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`camera-video-feed ${facingMode === 'user' ? 'mirror' : ''}`}
              />
              {/* Viewfinder Target Guides */}
              <div className="camera-guide-overlay" aria-hidden="true">
                <div className="guide-corner top-left"></div>
                <div className="guide-corner top-right"></div>
                <div className="guide-corner bottom-left"></div>
                <div className="guide-corner bottom-right"></div>
                <div className="guide-center-reticle"></div>
              </div>
            </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Modal Footer Controls */}
        <div className="camera-modal-footer">
          {capturedImage ? (
            <div className="camera-decision-buttons">
              <button
                type="button"
                className="btn btn-secondary btn-large"
                onClick={handleRetake}
              >
                <RotateCcw size={16} />
                <span>Retake</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-large camera-confirm-btn"
                onClick={handleConfirm}
              >
                <Check size={18} />
                <span>Use This Photo</span>
              </button>
            </div>
          ) : !cameraError ? (
            <div className="camera-shutter-row">
              {hasMultipleCameras && (
                <button
                  type="button"
                  className="btn btn-secondary camera-switch-btn"
                  onClick={handleToggleFacingMode}
                  title="Switch camera"
                  aria-label="Switch camera"
                >
                  <RefreshCw size={18} />
                </button>
              )}
              
              <button
                type="button"
                className="camera-shutter-button"
                onClick={handleSnapPhoto}
                title="Snap photo"
                aria-label="Take photo"
                disabled={isLoading}
              >
                <div className="shutter-inner-ring">
                  <div className="shutter-core-circle"></div>
                </div>
              </button>

              <div className="camera-extra-options">
                <button
                  type="button"
                  className="btn btn-secondary camera-file-fallback-btn"
                  onClick={() => mobileCameraRef.current?.click()}
                  title="Open phone camera directly"
                >
                  <Smartphone size={15} />
                  <span>Phone Camera</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary camera-file-fallback-btn"
                  onClick={() => galleryRef.current?.click()}
                  title="Choose from photo gallery"
                >
                  <ImageIcon size={15} />
                  <span>Gallery</span>
                </button>
              </div>

              <input
                ref={mobileCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFallbackFileChange}
                style={{ display: 'none' }}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                onChange={handleFallbackFileChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
