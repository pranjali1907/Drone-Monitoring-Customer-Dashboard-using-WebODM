import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Card, CardContent, Alert, InputAdornment, Stack } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';

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
      setError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
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
        background: 'radial-gradient(circle at 10% 20%, rgba(10, 14, 23, 1) 0%, rgba(17, 24, 39, 1) 90%)',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dynamic Background visual glows */}
      <Box sx={{ position: 'absolute', width: 400, height: 400, bgcolor: 'rgba(59,130,246,0.06)', borderRadius: '50%', filter: 'blur(80px)', top: '-10%', left: '-10%' }} />
      <Box sx={{ position: 'absolute', width: 450, height: 450, bgcolor: 'rgba(16,185,129,0.04)', borderRadius: '50%', filter: 'blur(90px)', bottom: '-15%', right: '-10%' }} />

      <Card sx={{ width: '100%', maxWidth: 450, zIndex: 10, borderRadius: 4 }}>
        <CardContent sx={{ p: 4.5 }}>
          {/* Logo Header */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4.5 }}>
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                animation: 'float 4s ease-in-out infinite'
              }}
            >
              <FlightTakeoffIcon sx={{ fontSize: 28, color: 'white', transform: 'rotate(45deg)' }} />
            </Box>
            <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, textAlign: 'center' }}>
              SKYE<span style={{ color: '#3b82f6' }}>VIEW</span>
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, textAlign: 'center' }}>
              Drone Photogrammetry & Monitoring Dashboard
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3.5, borderRadius: 2 }}>{error}</Alert>}

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
                      <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
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
                      <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ py: 1.5, mt: 1 }}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </Button>
            </Stack>
          </form>

          {/* Quick sandbox prefill shortcuts */}
          <Box sx={{ mt: 4, pt: 3.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 2, textAlign: 'center', letterSpacing: '0.05em' }}>
              SANDBOX TEST ACCOUNTS
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => prefillLogin('admin')}
                sx={{ fontSize: '0.78rem', py: 0.8 }}
              >
                Super Admin
              </Button>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => prefillLogin('client')}
                sx={{ fontSize: '0.78rem', py: 0.8 }}
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
