import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, InputAdornment,
  IconButton, Alert, CircularProgress, Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordMismatch = confirm.length > 0 && password !== confirm;
  const passwordMatch    = confirm.length > 0 && password === confirm;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #064E3B 0%, #065F46 40%, #047857 70%, #0F172A 100%)',
        position: 'relative',
        overflow: 'hidden',
        p: 2,
      }}
    >
      {/* Ambient glow orbs */}
      <Box sx={{ position: 'absolute', top: '-15%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', top: '40%', left: '60%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Login Card */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 440,
          bgcolor: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '24px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          p: { xs: 3, sm: 4.5 },
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              p: 1.5,
              mb: 2.5,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <Box
              component="img"
              src="/eagle-logo.png"
              alt="Eagle Infra India Ltd."
              sx={{ height: 64, width: 'auto', display: 'block', objectFit: 'contain' }}
            />
          </Box>
          <Typography
            sx={{
              fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.6rem',
              color: '#ECFDF5', letterSpacing: '-0.02em', lineHeight: 1,
            }}
          >
            Eagle Infra
          </Typography>
          <Typography sx={{ color: 'rgba(167,243,208,0.8)', fontWeight: 500, fontSize: '0.85rem', mt: 0.3 }}>
            India Ltd. · SkyeView Drone Platform
          </Typography>
        </Box>

        {/* Security badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, mb: 3 }}>
          <SecurityRoundedIcon sx={{ fontSize: 14, color: 'rgba(167,243,208,0.6)' }} />
          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(167,243,208,0.6)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Secure Access — Password Verified
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2.5, borderRadius: '12px',
              bgcolor: 'rgba(239,68,68,0.12)', color: '#FCA5A5',
              border: '1px solid rgba(239,68,68,0.25)',
              '& .MuiAlert-icon': { color: '#F87171' },
            }}
          >
            {error}
          </Alert>
        )}

        {/* Email */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(167,243,208,0.9)', mb: 0.8, letterSpacing: '0.04em' }}>
            Email Address
          </Typography>
          <TextField
            id="login-email"
            type="email"
            fullWidth
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailRoundedIcon sx={{ color: 'rgba(167,243,208,0.5)', fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.06)',
                borderRadius: '12px',
                color: '#ECFDF5',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                '&:hover fieldset': { borderColor: 'rgba(16,185,129,0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#10B981', borderWidth: 2 },
                '& input': { color: '#ECFDF5', '&::placeholder': { color: 'rgba(167,243,208,0.35)', opacity: 1 } },
                '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px rgba(6,78,59,0.8) inset', WebkitTextFillColor: '#ECFDF5' },
              },
            }}
          />
        </Box>

        {/* Password */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(167,243,208,0.9)', mb: 0.8, letterSpacing: '0.04em' }}>
            Password
          </Typography>
          <TextField
            id="login-password"
            type={showPass ? 'text' : 'password'}
            fullWidth
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockRoundedIcon sx={{ color: 'rgba(167,243,208,0.5)', fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPass(p => !p)} sx={{ color: 'rgba(167,243,208,0.5)' }}>
                    {showPass ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.06)',
                borderRadius: '12px',
                color: '#ECFDF5',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                '&:hover fieldset': { borderColor: 'rgba(16,185,129,0.4)' },
                '&.Mui-focused fieldset': { borderColor: '#10B981', borderWidth: 2 },
                '& input': { color: '#ECFDF5', '&::placeholder': { color: 'rgba(167,243,208,0.35)', opacity: 1 } },
                '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px rgba(6,78,59,0.8) inset', WebkitTextFillColor: '#ECFDF5' },
              },
            }}
          />
        </Box>

        {/* Confirm Password */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(167,243,208,0.9)', letterSpacing: '0.04em' }}>
              Confirm Password
            </Typography>
            {passwordMismatch && (
              <Typography sx={{ fontSize: '0.7rem', color: '#FCA5A5', fontWeight: 600 }}>
                ✗ Passwords don't match
              </Typography>
            )}
            {passwordMatch && (
              <Typography sx={{ fontSize: '0.7rem', color: '#34D399', fontWeight: 600 }}>
                ✓ Passwords match
              </Typography>
            )}
          </Box>
          <TextField
            id="login-confirm-password"
            type={showConf ? 'text' : 'password'}
            fullWidth
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            autoComplete="current-password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockRoundedIcon sx={{ color: passwordMismatch ? 'rgba(239,68,68,0.6)' : passwordMatch ? 'rgba(52,211,153,0.7)' : 'rgba(167,243,208,0.5)', fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowConf(p => !p)} sx={{ color: 'rgba(167,243,208,0.5)' }}>
                    {showConf ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: passwordMismatch ? 'rgba(239,68,68,0.06)' : passwordMatch ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.06)',
                borderRadius: '12px',
                color: '#ECFDF5',
                '& fieldset': {
                  borderColor: passwordMismatch ? 'rgba(239,68,68,0.4)' : passwordMatch ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)',
                },
                '&:hover fieldset': { borderColor: passwordMismatch ? 'rgba(239,68,68,0.6)' : 'rgba(16,185,129,0.4)' },
                '&.Mui-focused fieldset': {
                  borderColor: passwordMismatch ? '#EF4444' : '#10B981',
                  borderWidth: 2,
                },
                '& input': { color: '#ECFDF5', '&::placeholder': { color: 'rgba(167,243,208,0.35)', opacity: 1 } },
                '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px rgba(6,78,59,0.8) inset', WebkitTextFillColor: '#ECFDF5' },
              },
            }}
          />
        </Box>

        {/* Submit */}
        <Button
          id="login-submit-btn"
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading || passwordMismatch}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LoginRoundedIcon />}
          sx={{
            py: 1.6, borderRadius: '12px', fontFamily: 'Outfit', fontWeight: 700,
            fontSize: '1rem', textTransform: 'none',
            background: loading || passwordMismatch
              ? 'rgba(16,185,129,0.3)'
              : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: '0 6px 20px rgba(16,185,129,0.35)',
            letterSpacing: '0.02em',
            '&:hover': {
              background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
              boxShadow: '0 8px 28px rgba(16,185,129,0.45)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {loading ? 'Signing In…' : 'Sign In Securely'}
        </Button>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'rgba(167,243,208,0.4)', px: 1 }}>
            EAGLE INFRA INDIA LTD.
          </Typography>
        </Divider>

        <Typography sx={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(167,243,208,0.4)' }}>
          SkyeView Drone Monitoring Platform · v2.0
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;
