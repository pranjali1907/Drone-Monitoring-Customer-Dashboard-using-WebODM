import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Tabs, Tab, Button, Chip,
  Grid, CircularProgress, Stack, Alert, Divider, IconButton, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MapIcon from '@mui/icons-material/Map';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import { MapView } from '../components/MapView';
import ThreeDViewer from '../components/ThreeDViewer';
import { useNavigate as useNav } from 'react-router-dom';

interface ProjectLayer {
  id: number;
  name: string;
  layer_type: string;
  drive_file_id: string | null;
  tile_url_pattern: string | null;
  status: string;
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

export const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState(0);

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
    // Poll every 8s to catch layer status changes
    const interval = setInterval(fetchProject, 8000);
    return () => clearInterval(interval);
  }, [id]);

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

  const plyLayers = project.layers.filter(l => l.layer_type === 'POINT_CLOUD_PLY');
  const hasYt     = project.youtube_before_id && project.youtube_after_id;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')} color="inherit">
          Back
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A' }}>
            {project.name}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            {project.location && (
              <Typography variant="body2" color="text.secondary">{project.location}</Typography>
            )}
            {project.survey_date && (
              <Chip label={project.survey_date} size="small" />
            )}
          </Stack>
        </Box>

        {hasYt && (
          <Button variant="outlined" startIcon={<OndemandVideoIcon />}
            onClick={() => navigate(`/compare?before=${project.youtube_before_id}&after=${project.youtube_after_id}`)}
            sx={{ borderColor: '#F59E0B', color: '#F59E0B', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' } }}>
            Video Comparison
          </Button>
        )}
      </Box>

      {/* Layer status badges */}
      {project.layers.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
          {project.layers.map(l => (
            <Chip key={l.id}
              label={`${l.name}: ${l.status}`}
              color={STATUS_COLOR[l.status] ?? 'default'}
              size="small"
              variant={l.status === 'READY' ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>
      )}

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: '1px solid #E2E8F0', px: 2,
                '& .MuiTab-root': { fontFamily: 'Outfit', fontWeight: 600, textTransform: 'none' },
                '& .Mui-selected': { color: '#10B981 !important' },
                '& .MuiTabs-indicator': { bgcolor: '#10B981' } }}>
          <Tab label="2D Map" icon={<MapIcon />} iconPosition="start" />
          <Tab label="3D Point Cloud" icon={<ViewInArIcon />} iconPosition="start" disabled={plyLayers.length === 0} />
        </Tabs>

        <Box>
          {tab === 0 && project.latitude && project.longitude && (
            <MapView
              projectId={project.id}
              latitude={project.latitude}
              longitude={project.longitude}
              boundaryWkt={undefined}
            />
          )}
          {tab === 0 && (!project.latitude || !project.longitude) && (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">No GPS coordinates set for this project.</Typography>
            </Box>
          )}
          {tab === 1 && (
            <ThreeDViewer layers={plyLayers as any} />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ProjectDetails;
