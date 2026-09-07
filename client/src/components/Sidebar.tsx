import React from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Box, Typography, Chip,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import AddBoxRoundedIcon from '@mui/icons-material/AddBoxRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';

const drawerWidth = 248;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { text: 'Dashboard', icon: <DashboardRoundedIcon />, path: '/dashboard', color: '#6366F1' },
        { text: 'Map View',  icon: <MapRoundedIcon />,       path: '/projects',   color: '#14B8A6' },
      ],
    },
    {
      label: 'Projects',
      items: [
        { text: 'All Projects', icon: <FolderOpenRoundedIcon />, path: '/projects',        color: '#F59E0B' },
        ...(isAdmin ? [{ text: 'New Project', icon: <AddBoxRoundedIcon />, path: '/projects/create', color: '#10B981' }] : []),
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

        {/* WebODM Live Status Widget (matching user screenshot) */}
        <Box sx={{ mx: 2, mt: 'auto', mb: 1.5 }}>
          <Box
            sx={{
              p: 1.5, borderRadius: '12px', bgcolor: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.18)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#6366F1', boxShadow: '0 0 6px #6366F1' }} />
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#4F46E5', letterSpacing: '0.04em' }}>
                  WEBODM LIVE
                </Typography>
              </Box>
              <Chip label="1" size="small" sx={{ height: 18, minWidth: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#6366F1', color: '#fff' }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.66rem', color: '#64748B', fontFamily: 'monospace' }}>
                task-7321...
              </Typography>
              <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, color: '#10B981' }}>
                0%
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Bottom Eagle Brand Badge */}
        <Box sx={{ mx: 2, pt: 0.5, pb: 2 }}>
          <Box
            sx={{
              p: 2, borderRadius: '14px', bgcolor: '#FFFFFF', border: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <Box
              component="img"
              src="/eagle-logo.png"
              alt="Eagle Infra India Ltd."
              sx={{ height: 48, width: 'auto', objectFit: 'contain' }}
            />
            <Typography 
              variant="h6" 
              sx={{ 
                fontFamily: "'Great Vibes', 'Brush Script MT', cursive",
                color: '#1A5F9F',
                fontWeight: 600,
                lineHeight: 1.1
              }}
            >
              Eagle - Infra
              <br/>
              India Ltd
            </Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
