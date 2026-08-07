import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Typography, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Button, Chip, Avatar, LinearProgress,
  Stack, Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import CloudSyncRoundedIcon from '@mui/icons-material/CloudSyncRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import SdStorageRoundedIcon from '@mui/icons-material/SdStorageRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import FlightRoundedIcon from '@mui/icons-material/FlightRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';

const formatStorage = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const statusConfig: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  completed:  { label: 'Completed',  bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
  processing: { label: 'Processing', bg: '#EDE9FE', color: '#5B21B6', dot: '#8B5CF6' },
  pending:    { label: 'Pending',    bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  failed:     { label: 'Failed',     bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

const KpiCard: React.FC<{
  title: string; value: string | number; desc: string;
  icon: React.ReactNode; gradient: string; borderClass: string; delay: number;
}> = ({ title, value, desc, icon, gradient, borderClass, delay }) => (
  <Card
    className={`kpi-card ${borderClass}`}
    sx={{ height: '100%', animation: `fadeInUp 0.5s ease ${delay}s both` }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box
          sx={{
            width: 48, height: 48, borderRadius: '13px',
            background: gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 16px ${gradient.includes('6366F1') ? 'rgba(99,102,241,0.25)' : gradient.includes('14B8A6') ? 'rgba(20,184,166,0.25)' : gradient.includes('F59E0B') ? 'rgba(245,158,11,0.25)' : 'rgba(244,63,94,0.25)'}`,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#F0FDF4', borderRadius: '8px', px: 1, py: 0.4 }}>
          <TrendingUpRoundedIcon sx={{ fontSize: 12, color: '#22C55E' }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534' }}>+12%</Typography>
        </Box>
      </Box>
      <Typography sx={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit', color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', mt: 0.5, mb: 0.3 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>
        {desc}
      </Typography>
    </CardContent>
  </Card>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, projRes] = await Promise.all([
          axios.get('/api/dashboard/stats'),
          axios.get('/api/projects'),
        ]);
        setStats(statsRes.data);
        setProjects(projRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '75vh', gap: 2 }}>
        <CircularProgress sx={{ color: '#6366F1' }} size={42} thickness={4} />
        <Typography sx={{ color: '#94A3B8', fontSize: '0.9rem', fontWeight: 500 }}>Loading dashboard…</Typography>
      </Box>
    );
  }

  const kpis = [
    {
      title: 'Total Projects', value: stats?.total_projects ?? 0, desc: 'Assigned surveying zones',
      icon: <FolderOpenRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />,
      gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)',
      borderClass: 'kpi-card-indigo', delay: 0,
    },
    {
      title: 'Active Processing', value: stats?.active_projects ?? 0, desc: 'Live WebODM datasets',
      icon: <CloudSyncRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />,
      gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)',
      borderClass: 'kpi-card-teal', delay: 0.08,
    },
    {
      title: 'Completed Runs', value: stats?.completed_projects ?? 0, desc: 'Orthophotos ready',
      icon: <TaskAltRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />,
      gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
      borderClass: 'kpi-card-amber', delay: 0.16,
    },
    {
      title: 'Cloud Storage', value: formatStorage(stats?.storage_usage ?? 0), desc: 'Used on this server',
      icon: <SdStorageRoundedIcon sx={{ color: '#fff', fontSize: 24 }} />,
      gradient: 'linear-gradient(135deg, #F43F5E, #E11D48)',
      borderClass: 'kpi-card-rose', delay: 0.24,
    },
  ];

  const recentLogs: any[] = stats?.latest_uploads ?? [];

  return (
    <Box className="page-enter" sx={{ py: 3.5, px: { xs: 2, md: 3 } }}>

      {/* ── Page Header ────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <FlightRoundedIcon sx={{ color: '#6366F1', fontSize: 20 }} />
            <Typography variant="caption" sx={{ color: '#6366F1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>
              Operations Control
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
            Survey Overview
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Real-time monitoring of WebODM jobs, drone imagery, and cloud storage.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => navigate('/projects/create')}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          New Project
        </Button>
      </Box>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {kpis.map((kpi, i) => (
          <Grid item xs={12} sm={6} lg={3} key={i}>
            <KpiCard {...kpi} />
          </Grid>
        ))}
      </Grid>

      {/* ── Main Content Row ───────────────────────────────────────── */}
      <Grid container spacing={3}>

        {/* Projects Table */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ animation: 'fadeInUp 0.55s ease 0.32s both' }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 2.5, borderBottom: '1px solid #E2E8F0' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A' }}>
                    Active Projects
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    {projects.length} total project{projects.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => navigate('/projects')}
                  sx={{ color: '#6366F1', fontWeight: 600, fontSize: '0.82rem' }}
                >
                  View all
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Survey Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Box sx={{ py: 5, textAlign: 'center' }}>
                            <FolderOpenRoundedIcon sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                            <Typography variant="body2" sx={{ color: '#94A3B8' }}>No projects found.</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      projects.slice(0, 7).map((proj) => {
                        const sc = statusConfig[proj.status] ?? statusConfig.pending;
                        return (
                          <TableRow key={proj.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar
                                  sx={{
                                    width: 34, height: 34, borderRadius: '9px',
                                    background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                                    fontSize: '0.75rem', fontWeight: 800,
                                  }}
                                >
                                  {proj.name?.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                  <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>
                                    {proj.name}
                                  </Typography>
                                  <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                                    ID #{proj.id}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ color: '#64748B', fontSize: '0.875rem' }}>
                              {proj.location || '—'}
                            </TableCell>
                            <TableCell sx={{ color: '#64748B', fontSize: '0.875rem' }}>
                              {proj.survey_date
                                ? new Date(proj.survey_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: 'inline-flex', alignItems: 'center', gap: 0.6,
                                  px: 1.2, py: 0.4, borderRadius: '20px',
                                  bgcolor: sc.bg, color: sc.color,
                                  fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Outfit',
                                }}
                              >
                                <RadioButtonCheckedRoundedIcon sx={{ fontSize: 8, color: sc.dot }} />
                                {sc.label}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => navigate(`/projects/${proj.id}`)}
                                endIcon={<ArrowForwardRoundedIcon />}
                                sx={{
                                  fontSize: '0.78rem', py: 0.5, px: 1.5, borderRadius: '8px',
                                  borderColor: '#E2E8F0', color: '#475569',
                                  '&:hover': { borderColor: '#6366F1', color: '#6366F1', bgcolor: 'rgba(99,102,241,0.05)' },
                                }}
                              >
                                Open
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Activity Feed */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', animation: 'fadeInUp 0.55s ease 0.4s both' }}>
            <CardContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #E2E8F0' }}>
                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A' }}>
                  Activity Log
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  Latest system events
                </Typography>
              </Box>

              <Box sx={{ p: 2.5, flexGrow: 1, overflowY: 'auto' }}>
                {recentLogs.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" sx={{ color: '#94A3B8' }}>No recent activity.</Typography>
                  </Box>
                ) : (
                  <Stack spacing={0} divider={<Divider sx={{ borderColor: '#F1F5F9' }} />}>
                    {recentLogs.map((log: any, idx: number) => {
                      const isUpload = String(log.action).startsWith('UPLOAD');
                      const color = isUpload ? '#6366F1' : '#14B8A6';
                      const bg = isUpload ? 'rgba(99,102,241,0.08)' : 'rgba(20,184,166,0.08)';
                      return (
                        <Box key={idx} sx={{ py: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                          <Box
                            sx={{
                              width: 32, height: 32, borderRadius: '9px', bgcolor: bg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                          >
                            {isUpload
                              ? <CloudSyncRoundedIcon sx={{ fontSize: 16, color }} />
                              : <TaskAltRoundedIcon sx={{ fontSize: 16, color }} />
                            }
                          </Box>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', mb: 0.2 }}>
                              {log.details}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={String(log.action).replace(/_/g, ' ')}
                                size="small"
                                sx={{
                                  height: 18, fontSize: '0.62rem', fontWeight: 700,
                                  bgcolor: bg, color, border: `1px solid ${color}22`,
                                }}
                              />
                              <Typography sx={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              {/* Storage usage bar at bottom */}
              <Box sx={{ px: 3, py: 2, borderTop: '1px solid #E2E8F0', bgcolor: '#FAFAFA' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Storage Usage</Typography>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366F1' }}>
                    {formatStorage(stats?.storage_usage ?? 0)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((stats?.storage_usage ?? 0) / (10 * 1024 * 1024 * 1024) * 100, 100)}
                  sx={{ height: 6 }}
                />
                <Typography sx={{ fontSize: '0.68rem', color: '#94A3B8', mt: 0.6 }}>
                  of 10 GB allocated
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
