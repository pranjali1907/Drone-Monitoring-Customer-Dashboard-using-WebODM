import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Tabs, Tab, Button, Chip,
  CircularProgress, Stack, Alert, Grid, Card, CardContent,
  CardMedia, TextField, Dialog, DialogContent, DialogTitle,
  IconButton, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MapIcon from '@mui/icons-material/Map';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import axios from 'axios';
import { MapView } from '../components/MapView';
import ThreeDViewer from '../components/ThreeDViewer';
import SplitViewer from './SplitViewer';
import { VolumeCalculator } from '../components/VolumeCalculator';

interface ProjectLayer {
  id: number;
  name: string;
  layer_type: string;
  drive_file_id: string | null;
  drive_url: string | null;
  tile_url_pattern: string | null;
  status: string;
  error_message?: string | null;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  location?: string;
  survey_date?: string;
  latitude?: number;
  longitude?: number;
  youtube_before_id?: string;
  youtube_after_id?: string;
  status: string;
  created_at: string;
  layers: ProjectLayer[];
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  READY: 'success', PROCESSING: 'warning', PENDING: 'warning', FAILED: 'error',
};

// ── Interactive Image Swipe Comparator ─────────────────────────────────────
const ImageSwipeCompare: React.FC<{ beforeImg?: string; afterImg?: string }> = ({
  beforeImg = 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1400&q=80',
  afterImg  = 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1400&q=80',
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging   = useRef(false);
  const [currentBefore, setCurrentBefore] = useState(beforeImg);
  const [currentAfter, setCurrentAfter]   = useState(afterImg);

  useEffect(() => {
    setCurrentBefore(beforeImg);
  }, [beforeImg]);

  useEffect(() => {
    setCurrentAfter(afterImg);
  }, [afterImg]);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  return (
    <Box
      ref={containerRef}
      onMouseDown={() => (isDragging.current = true)}
      onMouseUp={() => (isDragging.current = false)}
      onMouseLeave={() => (isDragging.current = false)}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      sx={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 300px)',
        minHeight: 480,
        overflow: 'hidden',
        userSelect: 'none',
        cursor: 'ew-resize',
        borderRadius: 2,
        bgcolor: '#000',
      }}
    >
      {/* Base Image (Before) */}
      <Box
        component="img"
        src={currentBefore}
        onError={() => setCurrentBefore('https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1400&q=80')}
        alt="Before Survey"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <Chip
        label="BEFORE: Baseline .ECW"
        size="small"
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 4,
          bgcolor: 'rgba(15,23,42,0.88)',
          color: '#F59E0B',
          fontWeight: 800,
          fontFamily: 'Outfit',
        }}
      />

      {/* Top Image (After - Clipped) */}
      <Box
        component="img"
        src={currentAfter}
        onError={() => setCurrentAfter('https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1400&q=80')}
        alt="After Survey"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
        }}
      />
      <Chip
        label="AFTER: Recent .ECW"
        size="small"
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 4,
          bgcolor: 'rgba(15,23,42,0.88)',
          color: '#10B981',
          fontWeight: 800,
          fontFamily: 'Outfit',
        }}
      />

      {/* Draggable Divider Line */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${sliderPos}%`,
          width: 3,
          bgcolor: '#FFFFFF',
          zIndex: 5,
          boxShadow: '0 0 10px rgba(0,0,0,0.6)',
          transform: 'translateX(-50%)',
        }}
      >
        {/* Central Handle */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 38,
            height: 38,
            borderRadius: '50%',
            bgcolor: '#10B981',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '2px solid #FFFFFF',
            fontSize: '1rem',
            fontWeight: 800,
          }}
        >
          ⬌
        </Box>
      </Box>
    </Box>
  );
};

export const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState(0);

  // Before/After comparison toggle: 'image' | 'video'
  const [compareType, setCompareType] = useState<'image' | 'video'>('image');

  // Admin pipeline form states
  const [newRasterUrl, setNewRasterUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineMsg, setPipelineMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lightbox preview for images
  const [previewImg, setPreviewImg] = useState<{ url: string; title: string } | null>(null);

  const fetchProject = async () => {
    try {
      const res = await axios.get(`/api/projects/${id}`);
      setProject(res.data);
    } catch {
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    const interval = setInterval(fetchProject, 6000);
    return () => clearInterval(interval);
  }, [id]);

  const handleTriggerIngest = async () => {
    if (!newRasterUrl.trim()) return;
    setIsSubmitting(true);
    setPipelineMsg(null);
    try {
      await axios.post(`/api/projects/${id}/ingest-raster?drive_url=${encodeURIComponent(newRasterUrl.trim())}`);
      setPipelineMsg({ type: 'success', text: 'GDAL Ingestion pipeline triggered successfully! Processing in background.' });
      setNewRasterUrl('');
      fetchProject();
    } catch (err: any) {
      setPipelineMsg({ type: 'error', text: err?.response?.data?.detail || 'Failed to trigger ingestion pipeline.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
      <CircularProgress sx={{ color: '#10B981' }} />
    </Box>
  );

  if (!project) return (
    <Box sx={{ p: 4 }}>
      <Alert severity="error">Project not found.</Alert>
    </Box>
  );

  const plyLayers    = project.layers.filter(l => l.layer_type === 'POINT_CLOUD_PLY');
  const rasterLayers = project.layers.filter(l => l.layer_type === 'RASTER_TILES');
  const hasYt        = !!(project.youtube_before_id && project.youtube_after_id);

  // Drone inspection image snapshots
  const surveyImages = [
    {
      title: 'Orthomosaic Nadir Survey Capture',
      tag: 'RGB Nadir 120m',
      url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
      resolution: '1.8 cm/px',
      altitude: '120 m AGL',
    },
    {
      title: 'Oblique Infrastructure Angle',
      tag: 'Oblique 45° Survey',
      url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1200&q=80',
      resolution: '2.1 cm/px',
      altitude: '90 m AGL',
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')} color="inherit" size="small">
          Back
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A' }}>
            {project.name}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
            {project.location && (
              <Typography variant="body2" color="text.secondary">📍 {project.location}</Typography>
            )}
            {project.survey_date && (
              <Typography variant="body2" color="text.secondary">📅 {project.survey_date}</Typography>
            )}
            <Chip
              label={project.status === 'active' ? 'Active Survey' : project.status}
              size="small"
              color="success"
              variant="outlined"
            />
          </Stack>
        </Box>
      </Box>

      {/* Main Unified Container */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          bgcolor: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Unified Tab Bar matching user spec */}
        <Box sx={{ borderBottom: '1px solid #E2E8F0', bgcolor: '#FAFAFA' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 1,
              minHeight: 52,
              '& .MuiTab-root': {
                fontFamily: 'Outfit',
                fontWeight: 600,
                fontSize: '0.88rem',
                textTransform: 'none',
                minHeight: 52,
                color: '#64748B',
                gap: 1,
                px: 2.5,
                '&:hover': { color: '#10B981' },
              },
              '& .Mui-selected': {
                color: '#10B981 !important',
                fontWeight: 700,
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#10B981',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab icon={<MapIcon fontSize="small" />} iconPosition="start" label="2D Orthomap" />
            <Tab icon={<ViewInArIcon fontSize="small" />} iconPosition="start" label="3D Model" />
            <Tab icon={<CalculateRoundedIcon fontSize="small" />} iconPosition="start" label="Stockpile Volume" />
            <Tab icon={<CompareArrowsIcon fontSize="small" />} iconPosition="start" label="Before/After" />
            <Tab icon={<PhotoLibraryIcon fontSize="small" />} iconPosition="start" label="Images (2)" />
            <Tab icon={<VideoLibraryIcon fontSize="small" />} iconPosition="start" label="Videos (2)" />
            <Tab icon={<DownloadIcon fontSize="small" />} iconPosition="start" label="Downloads" />
            <Tab icon={<CloudUploadIcon fontSize="small" />} iconPosition="start" label="Admin Pipeline" />
          </Tabs>
        </Box>

        {/* Tab 0: 2D Orthomap */}
        {tab === 0 && (
          <Box>
            {project.latitude && project.longitude ? (
              <MapView
                projectId={project.id}
                latitude={project.latitude}
                longitude={project.longitude}
              />
            ) : (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">No GPS coordinates set for this project.</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 1: 3D Model */}
        {tab === 1 && (
          <Box>
            <ThreeDViewer layers={plyLayers as any} />
          </Box>
        )}

        {/* Tab 2: Stockpile & Earthwork Volume Calculator (WebODM standard) */}
        {tab === 2 && (
          <Box>
            <VolumeCalculator />
          </Box>
        )}

        {/* Tab 3: Before/After Comparison (Image Swipe + Video Lockstep) */}
        {tab === 3 && (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A' }}>
                Multi-Epoch Survey Comparison
              </Typography>
              <ToggleButtonGroup
                value={compareType}
                exclusive
                size="small"
                onChange={(_, v) => v && setCompareType(v)}
                sx={{
                  bgcolor: '#F8FAFC',
                  borderRadius: 2,
                  '& .Mui-selected': { bgcolor: '#10B981 !important', color: '#fff !important' },
                }}
              >
                <ToggleButton value="image" sx={{ px: 2, py: 0.8, textTransform: 'none', fontWeight: 700, gap: 1 }}>
                  <PhotoLibraryIcon fontSize="small" /> Aerial Image Swipe
                </ToggleButton>
                <ToggleButton value="video" sx={{ px: 2, py: 0.8, textTransform: 'none', fontWeight: 700, gap: 1 }}>
                  <VideoLibraryIcon fontSize="small" /> Video Drift-Locked
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {compareType === 'image' ? (
              <Box>
                {/* Source attribution for .ECW files */}
                {rasterLayers.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={`🛰️ .ECW Baseline: ${rasterLayers[0]?.name || 'Layer #1'}`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    {rasterLayers.length > 1 && (
                      <Chip
                        label={`vs ${rasterLayers[1]?.name || 'Layer #2'}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                )}
                <ImageSwipeCompare
                  beforeImg={rasterLayers[0] ? `/tiles/${rasterLayers[0].id}/preview.jpg` : surveyImages[0]?.url}
                  afterImg={rasterLayers[1] ? `/tiles/${rasterLayers[1].id}/preview.jpg` : (rasterLayers[0] ? `/tiles/${rasterLayers[0].id}/preview.jpg` : surveyImages[1]?.url)}
                />
              </Box>
            ) : (
              <Box sx={{ height: 'calc(100vh - 320px)', minHeight: 480 }}>
                {hasYt ? (
                  <SplitViewer
                    initialBefore={project.youtube_before_id}
                    initialAfter={project.youtube_after_id}
                  />
                ) : (
                  <Box sx={{ p: 6, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ color: '#0F172A', mb: 1, fontFamily: 'Outfit' }}>
                      No YouTube Video IDs configured for this project
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Configure Before and After YouTube video IDs in the Admin Pipeline tab.
                    </Typography>
                    <Button variant="outlined" onClick={() => setTab(7)}>
                      Go to Admin Pipeline
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Tab 4: Images (2) */}
        {tab === 4 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#0F172A', fontFamily: 'Outfit' }}>
              High-Resolution Drone Aerial Snapshots
            </Typography>
            <Grid container spacing={3}>
              {surveyImages.map((img, idx) => (
                <Grid item xs={12} sm={6} key={idx}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#10B981',
                        boxShadow: '0 6px 20px rgba(16,185,129,0.15)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={() => setPreviewImg({ url: img.url, title: img.title })}
                  >
                    <CardMedia
                      component="img"
                      height="240"
                      image={img.url}
                      alt={img.title}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                          {img.title}
                        </Typography>
                        <Chip label={img.tag} size="small" color="success" variant="outlined" />
                      </Box>
                      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Resolution: <strong>{img.resolution}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Altitude: <strong>{img.altitude}</strong>
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Tab 5: Videos (2) */}
        {tab === 5 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#0F172A', fontFamily: 'Outfit' }}>
              Survey Inspection Footage
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PlayCircleFilledIcon sx={{ color: '#F59E0B' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Baseline (Before) Flight Video
                    </Typography>
                  </Box>
                  {project.youtube_before_id ? (
                    <Box sx={{ position: 'relative', pb: '56.25%', height: 0, overflow: 'hidden', borderRadius: 2 }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${project.youtube_before_id}`}
                        title="Before Survey Video"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>No Before Video ID configured.</Alert>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PlayCircleFilledIcon sx={{ color: '#10B981' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Current (After) Flight Video
                    </Typography>
                  </Box>
                  {project.youtube_after_id ? (
                    <Box sx={{ position: 'relative', pb: '56.25%', height: 0, overflow: 'hidden', borderRadius: 2 }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${project.youtube_after_id}`}
                        title="After Survey Video"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>No After Video ID configured.</Alert>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 6: Downloads */}
        {tab === 6 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#0F172A', fontFamily: 'Outfit' }}>
              Processed Geospatial Deliverables &amp; Exports
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
                    🗺️ High-Res Orthomosaic
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Full GeoTIFF / ECW orthomosaic in Web Mercator projection.
                  </Typography>
                  {rasterLayers.length > 0 && rasterLayers[0].drive_url ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      href={rasterLayers[0].drive_url}
                      target="_blank"
                      sx={{ borderColor: '#10B981', color: '#10B981' }}
                    >
                      Download GeoTIFF
                    </Button>
                  ) : (
                    <Chip label="Not available" size="small" variant="outlined" />
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
                    🧊 3D Point Cloud (.PLY)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Dense point cloud survey model with RGB vertex coloring.
                  </Typography>
                  {plyLayers.length > 0 && plyLayers[0].drive_url ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      href={plyLayers[0].drive_url}
                      target="_blank"
                      sx={{ borderColor: '#3B82F6', color: '#3B82F6' }}
                    >
                      Download PLY
                    </Button>
                  ) : (
                    <Chip label="Not available" size="small" variant="outlined" />
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
                    📐 Survey Boundary (GeoJSON)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Vector spatial boundary polygon in WGS84 coordinates.
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [project.longitude, project.latitude] },
                        properties: { name: project.name, date: project.survey_date }
                      }));
                      const dlAnchor = document.createElement('a');
                      dlAnchor.setAttribute("href", dataStr);
                      dlAnchor.setAttribute("download", `${project.name}_boundary.geojson`);
                      dlAnchor.click();
                    }}
                  >
                    Export GeoJSON
                  </Button>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
                    📑 Inspection Summary
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Client monitoring report with coordinates and flight timestamps.
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => window.print()}
                  >
                    Print Report
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tab 7: Admin Pipeline */}
        {tab === 7 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#0F172A', fontFamily: 'Outfit' }}>
              Autonomous Ingestion Pipeline &amp; Layer Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Monitor background GDAL reprojection and pyramid tiling status, or ingest additional Google Drive survey assets.
            </Typography>

            {pipelineMsg && (
              <Alert severity={pipelineMsg.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setPipelineMsg(null)}>
                {pipelineMsg.text}
              </Alert>
            )}

            {/* Ingest New Raster Form */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #D1FAE5', bgcolor: '#F0FDF4', mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
                🚀 Ingest Additional Raster (.ECW / .TIF)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Paste the public Google Drive link. The server will stream the file, run <code>gdalwarp</code> to EPSG:3857, and slice XYZ tiles automatically.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="https://drive.google.com/file/d/..."
                  value={newRasterUrl}
                  onChange={e => setNewRasterUrl(e.target.value)}
                  sx={{ bgcolor: '#FFFFFF' }}
                />
                <Button
                  variant="contained"
                  disabled={isSubmitting || !newRasterUrl.trim()}
                  onClick={handleTriggerIngest}
                  sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, whiteSpace: 'nowrap', px: 3 }}
                >
                  {isSubmitting ? 'Starting...' : 'Trigger GDAL'}
                </Button>
              </Box>
            </Paper>

            {/* Layers Status Table */}
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #E2E8F0', bgcolor: '#FAFAFA' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Active Project Layers ({project.layers.length})
                </Typography>
              </Box>
              {project.layers.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No layers linked to this project yet.</Typography>
                </Box>
              ) : (
                <Stack divider={<Box sx={{ height: 1, bgcolor: '#F1F5F9' }} />}>
                  {project.layers.map(layer => (
                    <Box key={layer.id} sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                            {layer.name}
                          </Typography>
                          <Chip label={layer.layer_type} size="small" variant="outlined" />
                        </Box>
                        {layer.tile_url_pattern && (
                          <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                            Tile Pattern: {layer.tile_url_pattern}
                          </Typography>
                        )}
                        {layer.error_message && (
                          <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                            Error: {layer.error_message}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        label={layer.status}
                        color={STATUS_COLOR[layer.status] ?? 'default'}
                        size="small"
                        icon={layer.status === 'READY' ? <CheckCircleIcon /> : undefined}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Box>
        )}
      </Paper>

      {/* Image Preview Lightbox Dialog */}
      <Dialog open={!!previewImg} onClose={() => setPreviewImg(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {previewImg?.title}
          <IconButton onClick={() => setPreviewImg(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {previewImg && (
            <img src={previewImg.url} alt={previewImg.title} style={{ width: '100%', display: 'block' }} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ProjectDetails;
