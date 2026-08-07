import React, { useState, useRef } from 'react';
import { Box, Button, Typography, Paper, LinearProgress, CircularProgress, List, ListItem, ListItemText, Alert, Chip, Divider } from '@mui/material';
import axios from 'axios';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface UploadManagerProps {
  projectId: number;
  onUploadSuccess: () => void;
  currentStatus: string;
}

export const UploadManager: React.FC<UploadManagerProps> = ({ projectId, onUploadSuccess, currentStatus }) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      // Validate extensions (.jpg, .jpeg, .tif, .tiff)
      const validFiles = droppedFiles.filter(file => {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        return ['.jpg', '.jpeg', '.tif', '.tiff'].includes(ext);
      });
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);
    setStatusMessage(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      // Simulate network uploading progress bar
      const interval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
      }, 500);

      await axios.post(`/api/uploads/project/${projectId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(interval);
      setUploadProgress(100);
      setStatusMessage({ type: 'success', text: `Uploaded ${files.length} images successfully!` });
      setFiles([]);
      onUploadSuccess();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.detail || 'Upload failed' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartWebODM = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await axios.post(`/api/jobs/project/${projectId}/start`);
      setStatusMessage({ type: 'success', text: 'WebODM Processing task initiated successfully!' });
      onUploadSuccess(); // Reload parent state
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to start WebODM' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
        Drone Imagery Pipeline
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Current Project Status:
        </Typography>
        <Chip
          label={currentStatus.toUpperCase()}
          color={
            currentStatus === 'completed' ? 'success' :
            currentStatus === 'processing' ? 'primary' : 'default'
          }
          size="small"
          sx={{ fontWeight: 800, fontSize: '0.7rem' }}
        />
      </Box>

      {statusMessage && (
        <Alert severity={statusMessage.type} sx={{ borderRadius: 2 }}>
          {statusMessage.text}
        </Alert>
      )}

      {/* Drag & Drop Area */}
      <Paper
        elevation={0}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'rgba(255,255,255,0.15)',
          borderRadius: 4,
          p: 5,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: dragActive ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.01)',
          transition: 'all 0.25s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'rgba(255,255,255,0.02)'
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.tif,.tiff"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Drag & drop drone survey files here
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Supports JPG, JPEG, and TIFF mapping files
        </Typography>
      </Paper>

      {/* Selected Files List */}
      {files.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
            Files Selected ({files.length})
          </Typography>
          <List dense sx={{ maxHeight: 180, overflowY: 'auto' }}>
            {files.map((file, idx) => (
              <ListItem
                key={idx}
                secondaryAction={
                  <Button size="small" color="error" onClick={() => handleRemoveFile(idx)}>
                    <CancelIcon fontSize="small" />
                  </Button>
                }
                sx={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                  primaryTypographyProps={{ fontSize: '0.85rem', noWrap: true }}
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleUpload}
              disabled={isUploading}
            >
              Upload Images to Cloud
            </Button>
          </Box>
        </Paper>
      )}

      {isUploading && (
        <Box sx={{ width: '100%' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Uploading Files...
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 3 }} />
        </Box>
      )}

      <Divider />

      {/* WebODM Orchestrator */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid rgba(59,130,246,0.15)', bgcolor: 'rgba(59,130,246,0.01)' }}>
        <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FlightTakeoffIcon sx={{ color: 'primary.light' }} /> WebODM Processing Core
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3.5 }}>
          Trigger WebODM Photogrammetry calculations. The pipeline automatically constructs high resolution orthophotos, elevation models (DSM/DTM), and 3D textured mesh layouts from the uploaded drone survey folder.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          fullWidth
          onClick={handleStartWebODM}
          disabled={currentStatus === 'processing' || isProcessing}
          startIcon={currentStatus === 'processing' ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
        >
          {currentStatus === 'processing' ? 'Processing Dataset...' : 'Trigger WebODM Pipeline'}
        </Button>
      </Paper>
    </Box>
  );
};
export default UploadManager;
