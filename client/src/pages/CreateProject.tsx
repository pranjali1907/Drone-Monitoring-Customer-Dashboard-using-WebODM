import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Typography, TextField, Paper, Alert,
  Grid, Divider, Chip, CircularProgress, Stepper, Step, StepLabel,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LayersIcon from '@mui/icons-material/Layers';
import MapIcon from '@mui/icons-material/Map';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

// Click-on-map helper
const LocationPicker = ({ onPick }: { onPick: (lat: number, lng: number) => void }) => {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
};

export const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [createdId, setCreatedId] = useState<number | null>(null);

  // Form fields
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation]       = useState('');
  const [surveyDate, setSurveyDate]   = useState('');
  const [lat, setLat]                 = useState<number>(19.9975);
  const [lng, setLng]                 = useState<number>(73.8278);

  // Google Drive links
  const [rasterUrl, setRasterUrl]   = useState('');
  const [plyUrls, setPlyUrls]       = useState('');   // newline-separated

  // YouTube IDs
  const [ytBefore, setYtBefore]     = useState('');
  const [ytAfter, setYtAfter]       = useState('');

  const handleMapPick = (pickedLat: number, pickedLng: number) => {
    setLat(parseFloat(pickedLat.toFixed(6)));
    setLng(parseFloat(pickedLng.toFixed(6)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Project name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const plyList = plyUrls
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        name:               name.trim(),
        description:        description.trim() || null,
        location:           location.trim() || null,
        survey_date:        surveyDate || null,
        latitude:           lat,
        longitude:          lng,
        youtube_before_id:  ytBefore.trim() || null,
        youtube_after_id:   ytAfter.trim() || null,
        raster_drive_url:   rasterUrl.trim() || null,
        ply_drive_urls:     plyList.length > 0 ? plyList : null,
      };

      const res = await axios.post('/api/projects', payload);
      setCreatedId(res.data.id);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (createdId) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 72, color: '#10B981' }} />
        <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Project Created!
        </Typography>
        <Typography color="text.secondary" textAlign="center">
          Your project has been saved. If you provided a Google Drive raster link, GDAL processing
          has started in the background — the 2D map tiles will appear automatically once ready.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
            onClick={() => navigate(`/projects/${createdId}`)}>
            Open Project
          </Button>
          <Button variant="outlined" onClick={() => navigate('/projects')}>
            All Projects
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} color="inherit">
          Back
        </Button>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A' }}>
            Create New Project
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fill in the survey details, drop a pin on the map, and paste your Google Drive links.
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ── Left column: metadata ── */}
        <Grid item xs={12} md={6}>

          {/* Project Details */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MapIcon sx={{ color: '#10B981' }} /> Project Details
            </Typography>

            <TextField fullWidth label="Project Name *" value={name}
              onChange={e => setName(e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth label="Description" multiline rows={3} value={description}
              onChange={e => setDescription(e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth label="Region / Location Name" value={location}
              onChange={e => setLocation(e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth label="Survey Date" type="date" value={surveyDate}
              onChange={e => setSurveyDate(e.target.value)}
              InputLabelProps={{ shrink: true }} />
          </Paper>

          {/* GPS Coordinates */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              GPS Coordinates
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Click anywhere on the map (right column) to auto-fill coordinates, or enter manually.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Latitude" type="number" value={lat}
                  onChange={e => setLat(parseFloat(e.target.value))} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Longitude" type="number" value={lng}
                  onChange={e => setLng(parseFloat(e.target.value))} />
              </Grid>
            </Grid>
          </Paper>

          {/* YouTube */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(245,158,11,0.3)', mb: 3, bgcolor: 'rgba(245,158,11,0.02)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <YouTubeIcon sx={{ color: '#F59E0B' }} /> YouTube Video IDs
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Paste only the video ID (e.g. <code>dQw4w9WgXcQ</code>), not the full URL.
            </Typography>
            <TextField fullWidth label="Before Flight — YouTube Video ID" value={ytBefore}
              onChange={e => setYtBefore(e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth label="After Flight — YouTube Video ID" value={ytAfter}
              onChange={e => setYtAfter(e.target.value)} />
          </Paper>
        </Grid>

        {/* ── Right column: map + Drive links ── */}
        <Grid item xs={12} md={6}>

          {/* Map picker */}
          <Paper elevation={0} sx={{ p: 0, borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden', mb: 3 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #E2E8F0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Select Survey Location
              </Typography>
              <Chip label={`${lat}, ${lng}`} size="small" color="success" sx={{ mt: 0.5 }} />
            </Box>
            <MapContainer center={[lat, lng]} zoom={10} style={{ height: 280, width: '100%' }}>
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Esri"
              />
              <LocationPicker onPick={handleMapPick} />
              <Marker position={[lat, lng]} icon={markerIcon} />
            </MapContainer>
          </Paper>

          {/* Google Drive */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #D1FAE5', bgcolor: '#F0FDF4', mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudUploadIcon sx={{ color: '#10B981' }} /> Google Drive Data Links
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              <strong>Raster Orthomosaic</strong> (.ECW / .TIF) — GDAL will reproject and tile automatically in the background.
            </Typography>
            <TextField fullWidth placeholder="https://drive.google.com/file/d/..." value={rasterUrl}
              onChange={e => setRasterUrl(e.target.value)} sx={{ mb: 3, bgcolor: '#fff' }} />

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              <strong>Point Cloud PLY Files</strong> — one URL per line.
            </Typography>
            <TextField fullWidth multiline rows={3}
              placeholder={"https://drive.google.com/file/d/...\nhttps://drive.google.com/file/d/..."}
              value={plyUrls} onChange={e => setPlyUrls(e.target.value)} sx={{ bgcolor: '#fff' }} />
          </Paper>

          {/* Submit */}
          <Button
            fullWidth variant="contained" size="large"
            disabled={saving || !name.trim()}
            onClick={handleSubmit}
            sx={{
              py: 1.8, borderRadius: 2, fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem',
              background: saving ? undefined : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            }}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
          >
            {saving ? 'Creating Project…' : 'Create Project & Start Processing'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CreateProject;
