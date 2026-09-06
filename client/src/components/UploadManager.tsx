import React, { useState } from 'react';
import { Box, Button, Typography, Paper, TextField, Alert, Divider } from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import SaveIcon from '@mui/icons-material/Save';
import StorageIcon from '@mui/icons-material/Storage';

interface UploadManagerProps {
  projectId: number;
  onUploadSuccess: () => void;
  currentStatus: string;
}

export const UploadManager: React.FC<UploadManagerProps> = ({ onUploadSuccess }) => {
  const [youtubeLink, setYoutubeLink] = useState('');
  const [dataLink, setDataLink] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveLinks = () => {
    // In a real implementation, this would post to a backend API to save the links
    // For now, we simulate a successful save to update the UI
    setMessage({ type: 'success', text: 'External data links saved successfully to project.' });
    setTimeout(() => {
      onUploadSuccess();
      setMessage(null);
    }, 2000);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', flexGrow: 1 }}>
          External Data Links
        </Typography>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ borderRadius: '10px' }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* ── Section: Processed Data Link ──────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: '1px solid #D1FAE5', borderRadius: '14px', bgcolor: '#F0FDF4' }}
      >
        <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon sx={{ color: '#10B981' }} /> Processed Data Location (.ECW, etc.)
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mb: 2.5 }}>
          Provide the <strong>Google Drive</strong> link where the processed drone data (like .ecw files) is stored. Ensure the link access is set to allow reading so the dashboard can access the file directly.
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="e.g. https://drive.google.com/file/d/..."
          value={dataLink}
          onChange={(e) => setDataLink(e.target.value)}
          sx={{ mb: 2, bgcolor: '#FFFFFF' }}
        />
      </Paper>

      <Divider sx={{ borderColor: '#D1FAE5' }} />

      {/* ── Section: YouTube Video Link ───────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ p: 3, border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px', bgcolor: 'rgba(245,158,11,0.02)' }}
      >
        <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <YouTubeIcon sx={{ color: '#F59E0B' }} /> YouTube Video Link
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mb: 2.5 }}>
          Provide the link to the drone survey video hosted on YouTube. This prevents storing large video files on the cloud server.
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="e.g. https://www.youtube.com/watch?v=..."
          value={youtubeLink}
          onChange={(e) => setYoutubeLink(e.target.value)}
          sx={{ mb: 2, bgcolor: '#FFFFFF' }}
        />
      </Paper>

      {/* Save Button */}
      <Button
        variant="contained"
        fullWidth
        size="large"
        onClick={handleSaveLinks}
        disabled={!youtubeLink && !dataLink}
        sx={{
          mt: 1, borderRadius: '10px',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
          '&:hover': { background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)' },
        }}
        startIcon={<SaveIcon />}
      >
        Save External Links to Project
      </Button>
    </Box>
  );
};
export default UploadManager;
