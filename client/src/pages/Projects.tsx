import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, CardActions,
  Button, CircularProgress, TextField, InputAdornment,
  Avatar, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  completed:  { label: 'Completed',  bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
  processing: { label: 'Processing', bg: '#EDE9FE', color: '#5B21B6', dot: '#8B5CF6' },
  pending:    { label: 'Pending',    bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  draft:      { label: 'Draft',      bg: '#F1F5F9', color: '#475569', dot: '#94A3B8' },
  failed:     { label: 'Failed',     bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

const GRADIENT_POOL = [
  'linear-gradient(135deg, #6366F1, #4F46E5)',
  'linear-gradient(135deg, #14B8A6, #0D9488)',
  'linear-gradient(135deg, #F59E0B, #D97706)',
  'linear-gradient(135deg, #F43F5E, #E11D48)',
  'linear-gradient(135deg, #3B82F6, #2563EB)',
  'linear-gradient(135deg, #10B981, #059669)',
];

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    axios.get('/api/projects')
      .then(res => setProjects(res.data))
      .catch(err => console.error('Failed to fetch projects:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.location || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '75vh', gap: 2 }}>
        <CircularProgress sx={{ color: '#6366F1' }} size={42} thickness={4} />
        <Typography sx={{ color: '#94A3B8', fontSize: '0.9rem' }}>Loading projects…</Typography>
      </Box>
    );
  }

  return (
    <Box className="page-enter" sx={{ py: 3.5, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
            Project Directory
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} · Browse orthophotos, 3D meshes & reports
          </Typography>
        </Box>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => navigate('/projects/create')}
          >
            New Project
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3.5, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by name or location…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, maxWidth: 380, bgcolor: '#fff', borderRadius: '10px',
            '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FilterListRoundedIcon sx={{ fontSize: 16 }} /> Status
            </Box>
          </InputLabel>
          <Select
            value={statusFilter}
            label="Status Filter"
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ bgcolor: '#fff', borderRadius: '10px' }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '20px', bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <FolderOpenRoundedIcon sx={{ fontSize: 40, color: '#CBD5E1' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#475569', mb: 0.5 }}>
            {search || statusFilter !== 'all' ? 'No results found' : 'No projects yet'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
            {search || statusFilter !== 'all' ? 'Try adjusting your search or filter' : 'Create a project to get started.'}
          </Typography>
          {isAdmin && (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('/projects/create')}>
              Create First Project
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((project, idx) => {
            const sc = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
            const gradient = GRADIENT_POOL[idx % GRADIENT_POOL.length];
            const imageCount = project.images?.length ?? 0;
            return (
              <Grid item xs={12} sm={6} lg={4} key={project.id}>
                <Card
                  sx={{
                    height: '100%', display: 'flex', flexDirection: 'column',
                    animation: `fadeInUp 0.45s ease ${(idx * 0.06).toFixed(2)}s both`,
                    cursor: 'pointer',
                    '&:hover .open-btn': { opacity: 1, transform: 'translateX(0)' },
                  }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {/* Card Banner */}
                  <Box
                    sx={{
                      height: 6,
                      background: gradient,
                    }}
                  />

                  <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Top: Avatar + Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          width: 44, height: 44, borderRadius: '12px',
                          background: gradient, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Outfit',
                        }}
                      >
                        {project.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box
                        sx={{
                          display: 'inline-flex', alignItems: 'center', gap: 0.5,
                          px: 1.2, py: 0.4, borderRadius: '20px',
                          bgcolor: sc.bg, color: sc.color, fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Outfit',
                        }}
                      >
                        <RadioButtonCheckedRoundedIcon sx={{ fontSize: 8, color: sc.dot }} />
                        {sc.label}
                      </Box>
                    </Box>

                    {/* Title */}
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'Outfit', color: '#0F172A', mb: 0.5, lineHeight: 1.3 }}>
                        {project.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#64748B', fontSize: '0.82rem', lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}
                      >
                        {project.description || 'No description provided.'}
                      </Typography>
                    </Box>

                    {/* Meta */}
                    <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
                        <Typography sx={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>
                          {project.location || 'Location not set'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarMonthRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
                        <Typography sx={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>
                          {project.survey_date
                            ? new Date(project.survey_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Date not set'}
                        </Typography>
                      </Box>
                      {imageCount > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ImageRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
                          <Typography sx={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>
                            {imageCount} survey image{imageCount !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>

                  <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      endIcon={<ArrowForwardRoundedIcon />}
                      className="open-btn"
                      sx={{
                        borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem',
                        borderColor: '#E2E8F0', color: '#475569',
                        '&:hover': { borderColor: '#6366F1', color: '#6366F1', bgcolor: 'rgba(99,102,241,0.05)' },
                      }}
                    >
                      Open Workspace
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default Projects;
