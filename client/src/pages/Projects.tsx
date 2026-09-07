import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Paper, Chip, CircularProgress,
  TextField, InputAdornment, Stack, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MapIcon from '@mui/icons-material/Map';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Project {
  id: number;
  name: string;
  description?: string;
  location?: string;
  survey_date?: string;
  status: string;
  layers: { id: number; layer_type: string; status: string }[];
  youtube_before_id?: string;
  youtube_after_id?: string;
}

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [error, setError]       = useState('');

  useEffect(() => {
    axios.get('/api/projects')
      .then(r => setProjects(r.data))
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.location || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
      <CircularProgress sx={{ color: '#10B981' }} />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A' }}>
            Survey Projects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {projects.length} project{projects.length !== 1 ? 's' : ''} total
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => navigate('/projects/create')}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' },
                  borderRadius: 2, fontFamily: 'Outfit', fontWeight: 700 }}>
            New Project
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Search */}
      <TextField fullWidth placeholder="Search projects…" value={search}
        onChange={e => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        sx={{ mb: 3, maxWidth: 480 }} />

      {/* Project cards */}
      {filtered.length === 0 ? (
        <Paper elevation={0} sx={{ p: 8, textAlign: 'center', border: '1px dashed #CBD5E1', borderRadius: 3 }}>
          <FolderOpenIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 2 }} />
          <Typography color="text.secondary">
            {projects.length === 0 ? 'No projects yet. Create your first one!' : 'No projects match your search.'}
          </Typography>
          {isAdmin && projects.length === 0 && (
            <Button variant="contained" sx={{ mt: 3, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
              onClick={() => navigate('/projects/create')}>
              Create First Project
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filtered.map(project => {
            const rasterReady = project.layers.some(l => l.layer_type === 'RASTER_TILES' && l.status === 'READY');
            const plyReady    = project.layers.some(l => l.layer_type === 'POINT_CLOUD_PLY'  && l.status === 'READY');
            const processing  = project.layers.some(l => ['PENDING','PROCESSING'].includes(l.status));
            const hasYt       = project.youtube_before_id && project.youtube_after_id;

            return (
              <Grid item xs={12} sm={6} lg={4} key={project.id}>
                <Paper elevation={0} sx={{
                  p: 3, borderRadius: 3, border: '1px solid #E2E8F0',
                  cursor: 'pointer', transition: 'all .2s',
                  '&:hover': { borderColor: '#10B981', boxShadow: '0 4px 24px rgba(16,185,129,.12)' },
                }} onClick={() => navigate(`/projects/${project.id}`)}>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A',
                        fontSize: '1rem', lineHeight: 1.3 }}>
                      {project.name}
                    </Typography>
                    {processing && <CircularProgress size={16} sx={{ color: '#F59E0B' }} />}
                  </Box>

                  {project.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {project.description}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mb: 1.5 }}>
                    {project.location && <Chip label={project.location} size="small" variant="outlined" />}
                    {project.survey_date && <Chip label={project.survey_date} size="small" variant="outlined" />}
                  </Stack>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack direction="row" spacing={1}>
                    {rasterReady && (
                      <Chip icon={<MapIcon />} label="2D Map" size="small" color="success" variant="outlined" />
                    )}
                    {plyReady && (
                      <Chip icon={<ViewInArIcon />} label="3D Cloud" size="small" color="primary" variant="outlined" />
                    )}
                    {hasYt && (
                      <Chip icon={<OndemandVideoIcon />} label="Video" size="small"
                        sx={{ borderColor: '#F59E0B', color: '#F59E0B' }} variant="outlined" />
                    )}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

// inline Divider
const Divider = ({ sx }: { sx?: object }) => (
  <Box sx={{ height: 1, bgcolor: '#F1F5F9', ...sx }} />
);

export default Projects;
