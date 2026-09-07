import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Button, Stack, CircularProgress, Chip,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LayersIcon from '@mui/icons-material/Layers';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Stats {
  total_projects: number;
  active_projects: number;
  ready_layers: number;
  processing_layers: number;
}

interface Project {
  id: number;
  name: string;
  location?: string;
  survey_date?: string;
  status: string;
  layers: { status: string }[];
}

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) => (
  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', flex: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{label}</Typography>
      </Box>
    </Box>
  </Paper>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [stats, setStats]         = useState<Stats | null>(null);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/dashboard/stats'),
      axios.get('/api/projects'),
    ]).then(([sRes, pRes]) => {
      setStats(sRes.data);
      setProjects(pRes.data.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
      <CircularProgress sx={{ color: '#10B981' }} />
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Welcome */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A' }}>
          Welcome back, {user?.full_name?.split(' ')[0] ?? 'Admin'} 👋
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          Eagle - Infra India Ltd | Drone Survey Monitoring Dashboard
        </Typography>
      </Box>

      {/* Stat cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 4 }}>
        <StatCard icon={<FolderIcon sx={{ color: '#6366F1' }} />}
          label="Total Projects" value={stats?.total_projects ?? 0} color="#6366F1" />
        <StatCard icon={<CheckCircleIcon sx={{ color: '#10B981' }} />}
          label="Active Projects" value={stats?.active_projects ?? 0} color="#10B981" />
        <StatCard icon={<LayersIcon sx={{ color: '#3B82F6' }} />}
          label="Ready Layers" value={stats?.ready_layers ?? 0} color="#3B82F6" />
        <StatCard icon={<SyncIcon sx={{ color: '#F59E0B' }} />}
          label="Processing" value={stats?.processing_layers ?? 0} color="#F59E0B" />
      </Stack>

      {/* Recent projects */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Recent Projects
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isAdmin && (
            <Button variant="contained" size="small" startIcon={<AddIcon />}
              onClick={() => navigate('/projects/create')}
              sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: 2, fontWeight: 700 }}>
              New Project
            </Button>
          )}
          <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/projects')}>
            View All
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {projects.length === 0 && (
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px dashed #CBD5E1', borderRadius: 3 }}>
              <Typography color="text.secondary">No projects yet.</Typography>
              {isAdmin && (
                <Button variant="contained" sx={{ mt: 2, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                  onClick={() => navigate('/projects/create')}>
                  Create First Project
                </Button>
              )}
            </Paper>
          </Grid>
        )}
        {projects.map(p => {
          const processing = p.layers.some(l => ['PENDING','PROCESSING'].includes(l.status));
          return (
            <Grid item xs={12} sm={6} lg={4} key={p.id}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0',
                  cursor: 'pointer', '&:hover': { borderColor: '#10B981' }, transition: 'border .2s' }}
                onClick={() => navigate(`/projects/${p.id}`)}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A' }}>
                    {p.name}
                  </Typography>
                  {processing
                    ? <CircularProgress size={16} sx={{ color: '#F59E0B' }} />
                    : <Chip label="Active" size="small" color="success" />}
                </Box>
                {p.location && (
                  <Typography variant="caption" color="text.secondary">{p.location}</Typography>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default Dashboard;
