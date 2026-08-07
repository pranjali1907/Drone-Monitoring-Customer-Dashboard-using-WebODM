import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Card, CardContent,
  Grid, Stack, Alert, Chip, Divider
} from '@mui/material';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded';

// Fix Leaflet default marker icon in Vite builds
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

export const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName]             = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation]     = useState('');
  const [lat, setLat]               = useState<number>(20.5937);
  const [lng, setLng]               = useState<number>(78.9629);
  const [surveyDate, setSurveyDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  // Map click handler
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setLat(parseFloat(e.latlng.lat.toFixed(6)));
        setLng(parseFloat(e.latlng.lng.toFixed(6)));
      },
    });
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Project name is required.'); return; }
    setLoading(true);
    setError(null);

    const bounds = 0.001;
    const boundaryGeoJson = {
      type: 'Polygon',
      coordinates: [[
        [lng - bounds, lat - bounds],
        [lng - bounds, lat + bounds],
        [lng + bounds, lat + bounds],
        [lng + bounds, lat - bounds],
        [lng - bounds, lat - bounds],
      ]],
    };

    try {
      const res = await axios.post('/api/projects', {
        name, description, location,
        latitude: lat, longitude: lng,
        boundary: JSON.stringify(boundaryGeoJson),
        survey_date: surveyDate,
      });
      navigate(`/projects/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="page-enter" sx={{ py: 3.5, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 4 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/projects')}
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ borderRadius: '10px', borderColor: '#E2E8F0', color: '#475569', flexShrink: 0, mt: 0.5 }}
        >
          Back
        </Button>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', mb: 0.5 }}>
            Create New Project
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Define a survey zone, set GPS coordinates on the map, and initialize the WebODM pipeline.
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Form Fields */}
          <Grid item xs={12} lg={5}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DriveFileRenameOutlineRoundedIcon sx={{ fontSize: 18, color: '#6366F1' }} />
                  </Box>
                  <Typography sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A' }}>Project Details</Typography>
                </Box>

                <Stack spacing={2.5}>
                  <TextField
                    label="Project Name" required fullWidth
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Solar Farm Survey Q3"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#FAFAFA' } }}
                  />
                  <TextField
                    label="Description" fullWidth multiline rows={3}
                    value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Describe the survey scope and objectives…"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#FAFAFA' } }}
                  />
                  <TextField
                    label="Region / Location Name" fullWidth
                    value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Rajasthan, India"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#FAFAFA' } }}
                  />
                  <TextField
                    label="Survey Date" type="date" required fullWidth
                    value={surveyDate} onChange={e => setSurveyDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#FAFAFA' } }}
                  />

                  <Divider />

                  <Box>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1.5 }}>
                      GPS Coordinates
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}>
                        <TextField
                          label="Latitude" type="number"
                          inputProps={{ step: 'any' }} fullWidth size="small"
                          value={lat} onChange={e => setLat(Number(e.target.value))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#FAFAFA' } }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Longitude" type="number"
                          inputProps={{ step: 'any' }} fullWidth size="small"
                          value={lng} onChange={e => setLng(Number(e.target.value))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#FAFAFA' } }}
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <MyLocationRoundedIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                      <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                        Click on the map to set coordinates automatically
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={<SaveRoundedIcon />}
                    fullWidth
                    sx={{ py: 1.5, borderRadius: '12px', mt: 1 }}
                  >
                    {loading ? 'Creating…' : 'Create & Initialize Project'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Map Section */}
          <Grid item xs={12} lg={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(20,184,166,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapRoundedIcon sx={{ fontSize: 18, color: '#14B8A6' }} />
                    </Box>
                    <Typography sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A' }}>Select Survey Location</Typography>
                  </Box>
                  <Chip
                    icon={<MyLocationRoundedIcon sx={{ fontSize: 14 }} />}
                    label={`${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                    size="small"
                    sx={{ bgcolor: 'rgba(99,102,241,0.08)', color: '#6366F1', fontWeight: 700, fontSize: '0.72rem' }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#94A3B8', mt: -1 }}>
                  Click anywhere on the map to set the project GPS coordinates. A boundary polygon will be generated automatically.
                </Typography>

                <Box sx={{ flexGrow: 1, minHeight: 400, borderRadius: '14px', overflow: 'hidden', border: '2px solid #E2E8F0' }}>
                  <MapContainer
                    center={[lat, lng]}
                    zoom={5}
                    scrollWheelZoom
                    style={{ width: '100%', height: '100%', minHeight: 400 }}
                  >
                    <MapEvents />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[lat, lng]} icon={markerIcon} />
                  </MapContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default CreateProject;
