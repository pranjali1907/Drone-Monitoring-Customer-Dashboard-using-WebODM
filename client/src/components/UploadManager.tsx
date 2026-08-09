import React, { useState, useRef } from 'react';
import {
  Box, Button, Typography, Paper, LinearProgress, CircularProgress,
  List, ListItem, ListItemText, Alert, Chip, Divider,
} from '@mui/material';
import axios from 'axios';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import VideoLibraryRoundedIcon from '@mui/icons-material/VideoLibraryRounded';

interface UploadManagerProps {
  projectId: number;
  onUploadSuccess: () => void;
  currentStatus: string;
  /** Path of already-saved PLY on server, if any */
  existingPlyPath?: string;
}

export const UploadManager: React.FC<UploadManagerProps> = ({ projectId, onUploadSuccess, currentStatus, existingPlyPath }) => {
  // ── Image upload state ──────────────────────────────────────────────────
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── PLY upload state ────────────────────────────────────────────────────
  const [plyFile, setPlyFile] = useState<File | null>(null);
  const [plyDragActive, setPlyDragActive] = useState(false);
  const [plyUploading, setPlyUploading] = useState(false);
  const [plyProgress, setPlyProgress] = useState(0);
  const [plyMessage, setPlyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const plyInputRef = useRef<HTMLInputElement>(null);

  // ── Video upload state ───────────────────────────────────────────────────
  const [videoFile, setVideoFile]   = useState<File | null>(null);
  const [videoDragActive, setVideoDragActive] = useState(false);
  const [videoUploading, setVideoUploading]   = useState(false);
  const [videoProgress, setVideoProgress]     = useState(0);
  const [videoMessage, setVideoMessage]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Image drag handlers ─────────────────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        return ['.jpg', '.jpeg', '.tif', '.tiff'].includes(ext);
      });
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(10);
    setStatusMessage(null);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    try {
      const interval = setInterval(() => setUploadProgress(prev => prev < 90 ? prev + 15 : prev), 500);
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
      onUploadSuccess();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to start WebODM' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  // ── PLY handlers ────────────────────────────────────────────────────────
  const handlePlyDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setPlyDragActive(true);
    else if (e.type === 'dragleave') setPlyDragActive(false);
  };

  const handlePlyDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setPlyDragActive(false);
    const dropped = Array.from(e.dataTransfer.files).find(f => f.name.toLowerCase().endsWith('.ply'));
    if (dropped) setPlyFile(dropped);
  };

  const handlePlyFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setPlyFile(e.target.files[0]);
  };

  const handlePlyUpload = async () => {
    if (!plyFile) return;
    setPlyUploading(true);
    setPlyProgress(20);
    setPlyMessage(null);
    const formData = new FormData();
    formData.append('file', plyFile);
    try {
      const interval = setInterval(() => setPlyProgress(prev => prev < 85 ? prev + 15 : prev), 400);
      await axios.post(`/api/uploads/project/${projectId}/ply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      clearInterval(interval);
      setPlyProgress(100);
      setPlyMessage({ type: 'success', text: `Point cloud "${plyFile.name}" uploaded! 3D Model tab is now unlocked.` });
      setPlyFile(null);
      onUploadSuccess(); // Reload project → unlocks 3D tab
    } catch (err: any) {
      setPlyMessage({ type: 'error', text: err.response?.data?.detail || 'PLY upload failed.' });
    } finally {
      setPlyUploading(false);
    }
  };

  const handleDeletePly = async () => {
    setPlyMessage(null);
    try {
      await axios.delete(`/api/uploads/project/${projectId}/ply`);
      setPlyMessage({ type: 'success', text: 'Point cloud deleted. 3D Model tab will lock until a new .ply is uploaded.' });
      setPlyFile(null);
      onUploadSuccess();
    } catch (err: any) {
      setPlyMessage({ type: 'error', text: err.response?.data?.detail || 'Delete failed.' });
    }
  };

  // ── Video handlers ───────────────────────────────────────────────────────
  const handleVideoDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setVideoDragActive(true);
    else if (e.type === 'dragleave') setVideoDragActive(false);
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setVideoDragActive(false);
    const dropped = Array.from(e.dataTransfer.files).find(f => /\.(mp4|mov|avi)$/i.test(f.name));
    if (dropped) setVideoFile(dropped);
  };

  const handleVideoFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setVideoFile(e.target.files[0]);
  };

  const handleVideoUpload = async () => {
    if (!videoFile) return;
    setVideoUploading(true);
    setVideoProgress(20);
    setVideoMessage(null);
    const formData = new FormData();
    formData.append('file', videoFile);
    try {
      const interval = setInterval(() => setVideoProgress(prev => prev < 85 ? prev + 10 : prev), 600);
      await axios.post(`/api/uploads/project/${projectId}/video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      clearInterval(interval);
      setVideoProgress(100);
      setVideoMessage({ type: 'success', text: `Video "${videoFile.name}" uploaded successfully!` });
      setVideoFile(null);
      onUploadSuccess();
    } catch (err: any) {
      setVideoMessage({ type: 'error', text: err.response?.data?.detail || 'Video upload failed.' });
    } finally {
      setVideoUploading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', flexGrow: 1 }}>
          Drone Imagery Pipeline
        </Typography>
        <Chip
          label={currentStatus.toUpperCase()}
          color={currentStatus === 'completed' ? 'success' : currentStatus === 'processing' ? 'primary' : 'default'}
          size="small"
          sx={{ fontWeight: 800, fontSize: '0.7rem' }}
        />
      </Box>

      {statusMessage && (
        <Alert severity={statusMessage.type} sx={{ borderRadius: '10px' }} onClose={() => setStatusMessage(null)}>
          {statusMessage.text}
        </Alert>
      )}

      {/* ── Section A: Image Upload ──────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: '1px solid #D1FAE5', borderRadius: '14px', bgcolor: '#F0FDF4' }}
      >
        <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUploadIcon sx={{ color: '#10B981' }} /> Survey Image Upload
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mb: 2.5 }}>
          Upload raw geotagged drone images (JPG, JPEG, TIF, TIFF) for WebODM photogrammetry processing.
        </Typography>

        <Paper
          elevation={0}
          onDragEnter={handleDrag} onDragOver={handleDrag}
          onDragLeave={handleDrag} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: '2px dashed',
            borderColor: dragActive ? '#10B981' : '#A7F3D0',
            borderRadius: '12px',
            p: 5, textAlign: 'center', cursor: 'pointer',
            bgcolor: dragActive ? 'rgba(16,185,129,0.08)' : '#FFFFFF',
            transition: 'all 0.25s ease',
            '&:hover': { borderColor: '#10B981', bgcolor: 'rgba(16,185,129,0.04)' }
          }}
        >
          <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.tif,.tiff" onChange={handleFileInput} style={{ display: 'none' }} />
          <CloudUploadIcon sx={{ fontSize: 44, color: '#A7F3D0', mb: 1.5 }} />
          <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A' }}>
            Drag & drop drone images here
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Supports JPG, JPEG, and TIFF mapping files
          </Typography>
        </Paper>

        {files.length > 0 && (
          <Paper elevation={0} sx={{ mt: 2.5, p: 2, border: '1px solid #D1FAE5', borderRadius: '10px', bgcolor: '#FFFFFF' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#0F172A' }}>
              Selected Files ({files.length})
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
                  sx={{ borderBottom: '1px solid #F0FDF4' }}
                >
                  <ListItemText
                    primary={file.name}
                    secondary={`${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                    primaryTypographyProps={{ fontSize: '0.85rem', noWrap: true, fontWeight: 600 }}
                    secondaryTypographyProps={{ color: '#94A3B8' }}
                  />
                </ListItem>
              ))}
            </List>
            <Button variant="contained" color="primary" fullWidth onClick={handleUpload} disabled={isUploading} sx={{ mt: 2, borderRadius: '10px' }}>
              Upload Images to Cloud
            </Button>
          </Paper>
        )}

        {isUploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748B', mb: 0.5, display: 'block' }}>
              Uploading {files.length} files…
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 3 }} />
          </Box>
        )}
      </Paper>

      {/* ── Section B: PLY Point Cloud Upload ───────────────────── */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', bgcolor: 'rgba(139,92,246,0.02)' }}
      >
        <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ViewInArRoundedIcon sx={{ color: '#8B5CF6' }} /> 3D Point Cloud Upload (.PLY)
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mb: 2.5 }}>
          Upload a <strong>.ply</strong> point cloud file directly. This instantly unlocks the 3D Model viewer tab and saves the cloud to the project server.
        </Typography>

        {plyMessage && (
          <Alert severity={plyMessage.type} sx={{ mb: 2.5, borderRadius: '10px' }} onClose={() => setPlyMessage(null)}>
            {plyMessage.text}
          </Alert>
        )}

        <Paper
          elevation={0}
          onDragEnter={handlePlyDrag} onDragOver={handlePlyDrag}
          onDragLeave={handlePlyDrag} onDrop={handlePlyDrop}
          onClick={() => plyInputRef.current?.click()}
          sx={{
            border: '2px dashed',
            borderColor: plyDragActive ? '#8B5CF6' : plyFile ? '#10B981' : 'rgba(139,92,246,0.3)',
            borderRadius: '12px', p: 4.5, textAlign: 'center', cursor: 'pointer',
            bgcolor: plyDragActive ? 'rgba(139,92,246,0.06)' : plyFile ? 'rgba(16,185,129,0.04)' : '#FFFFFF',
            transition: 'all 0.25s ease',
            '&:hover': { borderColor: '#8B5CF6', bgcolor: 'rgba(139,92,246,0.04)' }
          }}
        >
          <input ref={plyInputRef} type="file" accept=".ply" onChange={handlePlyFileInput} style={{ display: 'none' }} />
          <ViewInArRoundedIcon sx={{ fontSize: 44, color: plyFile ? '#10B981' : 'rgba(139,92,246,0.45)', mb: 1.5 }} />
          {plyFile ? (
            <>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#10B981' }}>
                ✓ {plyFile.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                {(plyFile.size / (1024 * 1024)).toFixed(2)} MB — click to change
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A' }}>
                Drag & drop a .ply point cloud here
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                ASCII or binary PLY format supported
              </Typography>
            </>
          )}
        </Paper>

        {plyUploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748B', mb: 0.5, display: 'block' }}>
              Uploading point cloud…
            </Typography>
            <LinearProgress variant="determinate" value={plyProgress} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: '#8B5CF6' } }} />
          </Box>
        )}

        {/* ── Existing PLY Banner + Delete ─────────────────────── */}
        {existingPlyPath && !plyFile && !plyUploading && (
          <Box sx={{
            mt: 2.5, p: 2, borderRadius: '10px',
            border: '1px solid rgba(16,185,129,0.25)',
            bgcolor: '#F0FDF4',
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <ViewInArRoundedIcon sx={{ color: '#10B981', flexShrink: 0 }} />
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <Typography sx={{ fontWeight: 700, color: '#065F46', fontSize: '0.88rem' }}>
                Point cloud saved on server
              </Typography>
              <Typography sx={{ fontSize: '0.76rem', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                point_cloud.ply
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DeleteForeverRoundedIcon />}
              onClick={handleDeletePly}
              sx={{
                borderRadius: '8px', flexShrink: 0,
                borderColor: '#FCA5A5', color: '#EF4444',
                '&:hover': { bgcolor: '#FEE2E2', borderColor: '#EF4444' },
                fontSize: '0.78rem', whiteSpace: 'nowrap',
              }}
            >
              Delete PLY
            </Button>
          </Box>
        )}

        {/* ── Upload button when new file selected ─────────────── */}
        {plyFile && !plyUploading && (
          <Button
            variant="contained"
            fullWidth
            onClick={handlePlyUpload}
            sx={{
              mt: 2.5, borderRadius: '10px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
              '&:hover': { background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)' },
            }}
            startIcon={<CheckCircleIcon />}
          >
            Upload Point Cloud to Server
          </Button>
        )}
      </Paper>

      <Divider sx={{ borderColor: '#D1FAE5' }} />

      {/* ── Section C: Video Upload ───────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px', bgcolor: 'rgba(245,158,11,0.02)' }}
      >
        <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VideoLibraryRoundedIcon sx={{ color: '#F59E0B' }} /> Drone Video Upload
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mb: 2.5 }}>
          Upload a drone survey video (<strong>.mp4, .mov, .avi</strong>). Videos appear in the Videos tab and can be used in Before/After video comparison.
        </Typography>

        {videoMessage && (
          <Alert severity={videoMessage.type} sx={{ mb: 2.5, borderRadius: '10px' }} onClose={() => setVideoMessage(null)}>
            {videoMessage.text}
          </Alert>
        )}

        <Paper
          elevation={0}
          onDragEnter={handleVideoDrag} onDragOver={handleVideoDrag}
          onDragLeave={handleVideoDrag} onDrop={handleVideoDrop}
          onClick={() => videoInputRef.current?.click()}
          sx={{
            border: '2px dashed',
            borderColor: videoDragActive ? '#F59E0B' : videoFile ? '#10B981' : 'rgba(245,158,11,0.3)',
            borderRadius: '12px', p: 4, textAlign: 'center', cursor: 'pointer',
            bgcolor: videoDragActive ? 'rgba(245,158,11,0.06)' : videoFile ? 'rgba(16,185,129,0.04)' : '#FFFFFF',
            transition: 'all 0.25s ease',
            '&:hover': { borderColor: '#F59E0B', bgcolor: 'rgba(245,158,11,0.04)' },
          }}
        >
          <input ref={videoInputRef} type="file" accept=".mp4,.mov,.avi" onChange={handleVideoFileInput} style={{ display: 'none' }} />
          <VideoLibraryRoundedIcon sx={{ fontSize: 40, color: videoFile ? '#10B981' : 'rgba(245,158,11,0.45)', mb: 1.2 }} />
          {videoFile ? (
            <>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#10B981' }}>✓ {videoFile.name}</Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>{(videoFile.size / (1024*1024)).toFixed(2)} MB — click to change</Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A' }}>Drag &amp; drop a video file here</Typography>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>MP4, MOV, AVI formats supported</Typography>
            </>
          )}
        </Paper>

        {videoUploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748B', mb: 0.5, display: 'block' }}>Uploading video…</Typography>
            <LinearProgress variant="determinate" value={videoProgress} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: '#F59E0B' } }} />
          </Box>
        )}

        {videoFile && !videoUploading && (
          <Button
            variant="contained"
            fullWidth
            onClick={handleVideoUpload}
            sx={{
              mt: 2.5, borderRadius: '10px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
              '&:hover': { background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)' },
            }}
            startIcon={<CheckCircleIcon />}
          >
            Upload Video to Server
          </Button>
        )}
      </Paper>

      <Divider sx={{ borderColor: '#D1FAE5' }} />

      {/* ── Section C: WebODM Processing ─────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: '1px solid rgba(16,185,129,0.2)', borderRadius: '14px', bgcolor: 'rgba(16,185,129,0.02)' }}
      >
        <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlightTakeoffIcon sx={{ color: '#10B981' }} /> WebODM Processing Core
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mb: 3.5 }}>
          Trigger WebODM Photogrammetry calculations. The pipeline automatically constructs high-resolution orthophotos, elevation models (DSM/DTM), and 3D textured mesh layouts from uploaded drone images.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          fullWidth
          onClick={handleStartWebODM}
          disabled={currentStatus === 'processing' || isProcessing}
          startIcon={currentStatus === 'processing' ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
          sx={{ borderRadius: '10px' }}
        >
          {currentStatus === 'processing' ? 'Processing Dataset…' : 'Trigger WebODM Pipeline'}
        </Button>
      </Paper>
    </Box>
  );
};
export default UploadManager;
