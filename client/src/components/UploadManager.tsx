import React, { useState } from 'react';
import { Box, Button, Typography, Paper, TextField, Alert, Divider } from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SaveIcon from '@mui/icons-material/Save';
import StorageIcon from '@mui/icons-material/Storage';
import axios from 'axios';

interface UploadManagerProps {
  projectId: number;
  onUploadSuccess: () => void;
  currentStatus: string;
}

export const UploadManager: React.FC<UploadManagerProps> = ({ projectId, onUploadSuccess }) => {
  const [youtubeBefore, setYoutubeBefore] = useState('');
  const [youtubeAfter, setYoutubeAfter] = useState('');
  const [rasterLink, setRasterLink] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveLinks = async () => {
    setIsProcessing(true);
    try {
      // 1. Update basic Project metadata (Youtube IDs)
      await axios.put(`/api/projects/${projectId}`, {
        youtube_before_id: youtubeBefore,
        youtube_after_id: youtubeAfter
      });

      // 2. Trigger async Raster Ingestion if a Drive link is provided
      if (rasterLink.includes('drive.google.com')) {
        await axios.post(`/api/projects/${projectId}/ingest-raster?url=${encodeURIComponent(rasterLink)}`);
      }

      setMessage({ type: 'success', text: 'External data links saved. GDAL Raster Ingestion started if provided.' });
      setTimeout(() => {
        onUploadSuccess();
        setMessage(null);
      }, 2500);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to save external links or start ingestion.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', flexGrow: 1 }}>
          External Data Links & Processing
        </Typography>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ borderRadius: '10px' }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Raster Data Link */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: '1px solid #D1FAE5', borderRadius: '14px', bgcolor: '#F0FDF4' }}
      >
        <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon sx={{ color: '#10B981' }} /> Ingest Raster Orthomosaic (.ECW / .TIF)
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mb: 2.5 }}>
          Provide the <strong>Google Drive</strong> link where the raw raster file is stored. The backend will asynchronously download it, reproject via GDAL, and generate XYZ map tiles.
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="e.g. https://drive.google.com/file/d/..."
          value={rasterLink}
          onChange={(e) => setRasterLink(e.target.value)}
          sx={{ mb: 2, bgcolor: '#FFFFFF' }}
        />
      </Paper>

      <Divider sx={{ borderColor: '#D1FAE5' }} />

      {/* YouTube Video Link */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px', bgcolor: 'rgba(245,158,11,0.02)' }}
      >
        <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <YouTubeIcon sx={{ color: '#F59E0B' }} /> YouTube Comparison Videos
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mb: 2.5 }}>
          Provide the YouTube video IDs for the before and after drone survey flights to enable Hardware-Locked Video Comparison.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            label="Before Flight YouTube ID"
            placeholder="e.g. dQw4w9WgXcQ"
            value={youtubeBefore}
            onChange={(e) => setYoutubeBefore(e.target.value)}
            sx={{ mb: 2, bgcolor: '#FFFFFF' }}
          />
          <TextField
            fullWidth
            variant="outlined"
            label="After Flight YouTube ID"
            placeholder="e.g. dQw4w9WgXcQ"
            value={youtubeAfter}
            onChange={(e) => setYoutubeAfter(e.target.value)}
            sx={{ mb: 2, bgcolor: '#FFFFFF' }}
          />
        </Box>
      </Paper>

      {/* Save Button */}
      <Button
        variant="contained"
        fullWidth
        size="large"
        disabled={isProcessing}
        onClick={handleSaveLinks}
        sx={{
          mt: 1, borderRadius: '10px',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
          '&:hover': { background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)' },
        }}
        startIcon={<SaveIcon />}
      >
        {isProcessing ? 'Processing GDAL / Saving...' : 'Save Data Links & Start Ingestion'}
      </Button>
    </Box>
  );
};
export default UploadManager;
