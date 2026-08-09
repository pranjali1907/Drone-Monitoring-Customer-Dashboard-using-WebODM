import React from 'react';
import { AppBar, Toolbar, Typography, Box, Avatar, Chip, IconButton, Badge, Tooltip } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() ?? 'A';

  const avatarGradient =
    user?.role === 'admin'
      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
      : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';

  return (
    <AppBar position="fixed" elevation={0} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, minHeight: 64 }}>

        {/* ── Brand ─────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Eagle Infra India Ltd. Logo */}
          <Box
            component="img"
            src="/eagle-logo.png"
            alt="Eagle Infra India Ltd."
            sx={{
              height: 44,
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
            }}
          />
          <Box sx={{ borderLeft: '1px solid #E2E8F0', pl: 1.5 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Outfit', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1,
                color: '#0F172A', fontSize: '1rem',
              }}
            >
              SkyeView
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500, lineHeight: 1, fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Drone Platform
            </Typography>
          </Box>
        </Box>

        {/* ── Right Controls ────────────────────────────────── */}
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Search projects">
              <IconButton
                size="small"
                sx={{
                  backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px',
                  width: 38, height: 38, color: '#64748B',
                  '&:hover': { backgroundColor: '#F0FDF4', color: '#10B981' },
                }}
              >
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton
                size="small"
                sx={{
                  backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px',
                  width: 38, height: 38, color: '#64748B',
                  '&:hover': { backgroundColor: '#F0FDF4', color: '#10B981' },
                }}
              >
                <Badge badgeContent={3} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}>
                  <NotificationsOutlinedIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            <Box sx={{ width: 1, height: 28, bgcolor: '#E2E8F0', mx: 0.5 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 0.5 }}>
              <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.2, fontSize: '0.85rem' }}>
                  {user.full_name || 'Administrator'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.72rem' }}>
                  {user.email}
                </Typography>
              </Box>
              <Avatar
                sx={{
                  width: 38, height: 38, background: avatarGradient,
                  fontSize: '0.85rem', fontWeight: 800, fontFamily: 'Outfit',
                  border: '2px solid #E2E8F0',
                  cursor: 'pointer',
                }}
              >
                {initials}
              </Avatar>

              <Chip
                label={user.role.toUpperCase()}
                size="small"
                sx={{
                  height: 22, fontSize: '0.62rem', fontWeight: 800,
                  bgcolor: user.role === 'admin' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  color: user.role === 'admin' ? '#059669' : '#B45309',
                  border: `1px solid ${user.role === 'admin' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  display: { xs: 'none', md: 'flex' },
                }}
              />

              <Tooltip title="Sign out">
                <IconButton
                  size="small"
                  onClick={logout}
                  sx={{
                    backgroundColor: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '10px',
                    width: 36, height: 36, color: '#F43F5E',
                    '&:hover': { backgroundColor: '#FFE4E6', borderColor: '#F43F5E' },
                  }}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
