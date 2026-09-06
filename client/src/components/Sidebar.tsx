import React, { useEffect, useState } from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Box, Typography, LinearProgress, Chip, Divider,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import AddBoxRoundedIcon from '@mui/icons-material/AddBoxRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import CloudSyncRoundedIcon from '@mui/icons-material/CloudSyncRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';

const drawerWidth = 248;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [activeJobs, setActiveJobs] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/dashboard/stats');
        const running = (response.data.processing_status || []).filter(
          (j: any) => j.status === 'running' || j.status === 'queued'
        );
        setActiveJobs(running);
      } catch { /* silent */ }
    };
    fetchStats();
    const id = setInterval(fetchStats, 8000);
    return () => clearInterval(id);
  }, []);

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { text: 'Dashboard', icon: <DashboardRoundedIcon />, path: '/dashboard', color: '#6366F1' },
        { text: 'Map View', icon: <MapRoundedIcon />, path: '/projects', color: '#14B8A6' },
      ],
    },
    {
      label: 'Projects',
      items: [
        { text: 'All Projects', icon: <FolderOpenRoundedIcon />, path: '/projects', color: '#F59E0B' },
        ...(isAdmin ? [{ text: 'New Project', icon: <AddBoxRoundedIcon />, path: '/projects/create', color: '#10B981' }] : []),
      ],
    },
    {
      label: 'System',
      items: [
        { text: 'Settings', icon: <TuneRoundedIcon />, path: '/settings', color: '#94A3B8' },
      ],
    },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar sx={{ minHeight: '64px !important' }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', pb: 2 }}>

        {/* Navigation Groups */}
        {navGroups.map((group) => (
          <Box key={group.label} sx={{ px: 1.5, pt: 2 }}>
            <Typography
              variant="caption"
              sx={{
                px: 1.5, mb: 1, display: 'block',
                color: '#94A3B8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.67rem',
              }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.4 }}>
                    <ListItemButton
                      onClick={() => navigate(item.path)}
                      sx={{
                        borderRadius: '10px',
                        px: 1.5, py: 1,
                        backgroundColor: isActive ? `${item.color}14` : 'transparent',
                        '&:hover': { backgroundColor: isActive ? `${item.color}1A` : '#F8FAFC' },
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        ...(isActive && {
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: 0, top: '20%', bottom: '20%',
                            width: 3, borderRadius: '0 3px 3px 0',
                            backgroundColor: item.color,
                          },
                        }),
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 36,
                          color: isActive ? item.color : '#94A3B8',
                          '& svg': { fontSize: 20 },
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? '#0F172A' : '#475569',
                          fontFamily: 'Outfit',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}

        {/* Active WebODM Jobs */}
        {activeJobs.length > 0 && (
          <Box sx={{ mt: 'auto', mx: 2, mb: 1 }}>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                p: 2, borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(79,70,229,0.04) 100%)',
                border: '1px solid rgba(99,102,241,0.12)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CloudSyncRoundedIcon sx={{ color: '#6366F1', fontSize: 16, animation: 'spin-slow 3s linear infinite' }} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#6366F1', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.67rem' }}>
                  WebODM Live
                </Typography>
                <Chip label={activeJobs.length} size="small" sx={{ height: 16, fontSize: '0.62rem', bgcolor: '#6366F1', color: '#fff', ml: 'auto' }} />
              </Box>
              {activeJobs.map((job) => (
                <Box key={job.task_id} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, fontSize: '0.72rem' }}>
                      {String(job.task_id).substring(0, 10)}…
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6366F1', fontWeight: 700, fontSize: '0.72rem' }}>
                      {Math.round(job.progress ?? 0)}%
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={job.progress ?? 0} sx={{ height: 5 }} />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Bottom Eagle Brand Badge */}
        <Box sx={{ mx: 2, mt: activeJobs.length > 0 ? 1 : 'auto', pt: 1 }}>
          <Box
            sx={{
              p: 1.5, borderRadius: '14px', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <Box
              component="img"
              src="/eagle-logo.png"
              alt="Eagle Infra India Ltd."
              sx={{ height: 38, width: 'auto', objectFit: 'contain' }}
            />
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
