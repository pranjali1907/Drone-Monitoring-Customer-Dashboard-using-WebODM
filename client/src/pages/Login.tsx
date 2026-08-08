import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Card, CardContent, Alert, InputAdornment, Stack, Divider } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const res = await axios.post('/api/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      login(res.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const prefillLogin = (role: 'admin' | 'client') => {
    if (role === 'admin') {
      setEmail('admin@dronemonitor.com');
      setPassword('admin123');
    } else {
      setEmail('client@dronemonitor.com');
      setPassword('client123');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 20% 10%, #0F2B1A 0%, #0A1A10 55%, #031208 100%)',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient green light orbs */}
      <Box sx={{ position: 'absolute', width: 500, height: 500, bgcolor: 'rgba(16,185,129,0.07)', borderRadius: '50%', filter: 'blur(90px)', top: '-15%', left: '-15%', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', width: 400, height: 400, bgcolor: 'rgba(245,158,11,0.05)', borderRadius: '50%', filter: 'blur(80px)', bottom: '-20%', right: '-10%', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', width: 300, height: 300, bgcolor: 'rgba(16,185,129,0.05)', borderRadius: '50%', filter: 'blur(70px)', top: '40%', right: '20%', pointerEvents: 'none' }} />

      {/* Subtle grid overlay */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <Card sx={{
        width: '100%', maxWidth: 460, zIndex: 10,
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(16,185,129,0.2)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1) inset',
      }}>
        <CardContent sx={{ p: 4.5 }}>
          {/* Logo Header */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 0 28px rgba(16, 185, 129, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2.5,
                animation: 'float 4s ease-in-out infinite'
              }}
            >
              <FlightTakeoffIcon sx={{ fontSize: 30, color: 'white', transform: 'rotate(45deg)' }} />
            </Box>
            <Typography variant="h4" sx={{
              fontFamily: 'Outfit', fontWeight: 800, textAlign: 'center',
              color: '#FFFFFF', letterSpacing: '-0.02em',
            }}>
              SKYE<span style={{ color: '#10B981' }}>VIEW</span>
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mt: 0.8, textAlign: 'center', fontSize: '0.85rem' }}>
              Drone Photogrammetry & Monitoring Platform
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{
              mb: 3, borderRadius: '10px',
              background: 'rgba(244,63,94,0.12)',
              border: '1px solid rgba(244,63,94,0.3)',
              color: '#FCA5A5',
              '& .MuiAlert-icon': { color: '#F43F5E' }
            }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="Email Address"
                variant="outlined"
                fullWidth
                value={email}
                onChange={e => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#FFFFFF',
                    '& fieldset': { borderColor: 'rgba(16,185,129,0.25)' },
                    '&:hover fieldset': { borderColor: 'rgba(16,185,129,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#10B981' },
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#10B981' },
                }}
              />
              <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                value={password}
                onChange={e => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#FFFFFF',
                    '& fieldset': { borderColor: 'rgba(16,185,129,0.25)' },
                    '&:hover fieldset': { borderColor: 'rgba(16,185,129,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#10B981' },
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                  },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#10B981' },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.6, mt: 0.5,
                  background: loading ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                    boxShadow: '0 6px 28px rgba(16,185,129,0.55)',
                  },
                  transition: 'all 0.25s ease',
                }}
              >
                {loading ? 'Authenticating…' : 'Sign In'}
              </Button>
            </Stack>
          </form>

          {/* Sandbox prefill shortcuts */}
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ borderColor: 'rgba(16,185,129,0.12)', mb: 3 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', fontSize: '0.72rem', fontWeight: 700 }}>
                DEMO ACCESS
              </Typography>
            </Divider>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<AdminPanelSettingsIcon />}
                onClick={() => prefillLogin('admin')}
                sx={{
                  fontSize: '0.78rem', py: 0.9,
                  borderColor: 'rgba(16,185,129,0.3)',
                  color: '#34D399',
                  '&:hover': {
                    borderColor: '#10B981',
                    background: 'rgba(16,185,129,0.1)',
                  },
                  borderRadius: '8px',
                }}
              >
                Super Admin
              </Button>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<PersonIcon />}
                onClick={() => prefillLogin('client')}
                sx={{
                  fontSize: '0.78rem', py: 0.9,
                  borderColor: 'rgba(245,158,11,0.3)',
                  color: '#FCD34D',
                  '&:hover': {
                    borderColor: '#F59E0B',
                    background: 'rgba(245,158,11,0.1)',
                  },
                  borderRadius: '8px',
                }}
              >
                Survey Client
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
export default Login;
