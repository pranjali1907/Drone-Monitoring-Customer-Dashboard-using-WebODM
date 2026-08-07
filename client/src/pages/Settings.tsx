import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button,
  Grid, Stack, Alert, Divider, Avatar, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';

const InfoRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.2 }}>
    <Typography sx={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>{label}</Typography>
    <Typography sx={{ fontSize: '0.85rem', color: highlight ? '#6366F1' : '#0F172A', fontWeight: 700 }}>{value}</Typography>
  </Box>
);

export const Settings: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registerStatus, setRegisterStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [clients, setClients]   = useState<any[]>([]);

  const fetchClients = async () => {
    if (!isAdmin) return;
    try {
      const res = await axios.get('/api/auth/clients');
      setClients(res.data);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchClients(); }, [isAdmin]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;
    setSubmitting(true);
    setRegisterStatus(null);
    try {
      await axios.post('/api/auth/register-client', { email, password, full_name: fullName, role: 'client' });
      setRegisterStatus({ type: 'success', text: `✓ Client "${fullName}" registered successfully!` });
      setEmail(''); setPassword(''); setFullName('');
      fetchClients();
    } catch (err: any) {
      setRegisterStatus({ type: 'error', text: err.response?.data?.detail || 'Registration failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const serverParams = [
    { icon: <StorageRoundedIcon sx={{ fontSize: 18, color: '#6366F1' }} />, label: 'Database',       value: 'SQLite (PostGIS ready)' },
    { icon: <HubRoundedIcon     sx={{ fontSize: 18, color: '#14B8A6' }} />, label: 'API Framework',  value: 'FastAPI + Uvicorn' },
    { icon: <SecurityRoundedIcon sx={{ fontSize: 18, color: '#F59E0B' }} />, label: 'Auth',           value: 'JWT Bearer Tokens (bcrypt)' },
    { icon: <DnsRoundedIcon     sx={{ fontSize: 18, color: '#F43F5E' }} />, label: 'WebODM Endpoint', value: 'localhost:8000 (Simulator)' },
  ];

  return (
    <Box className="page-enter" sx={{ py: 3.5, px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', mb: 0.5 }}>
          Settings
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Manage your profile, system configuration, and client accounts.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={5} lg={4}>
          <Stack spacing={3}>
            {/* Profile Card */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar
                    sx={{
                      width: 56, height: 56, borderRadius: '16px',
                      background: user?.role === 'admin'
                        ? 'linear-gradient(135deg, #6366F1, #4F46E5)'
                        : 'linear-gradient(135deg, #14B8A6, #0D9488)',
                      fontSize: '1.3rem', fontWeight: 800, fontFamily: 'Outfit',
                    }}
                  >
                    {user?.full_name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? 'A'}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontFamily: 'Outfit', fontSize: '1rem', color: '#0F172A' }}>
                      {user?.full_name ?? 'Unknown User'}
                    </Typography>
                    <Chip
                      label={user?.role?.toUpperCase() ?? 'USER'}
                      size="small"
                      sx={{
                        mt: 0.5, height: 20, fontSize: '0.62rem', fontWeight: 800,
                        bgcolor: user?.role === 'admin' ? 'rgba(99,102,241,0.1)' : 'rgba(20,184,166,0.1)',
                        color: user?.role === 'admin' ? '#6366F1' : '#0D9488',
                      }}
                    />
                  </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Stack>
                  <InfoRow label="Full Name"    value={user?.full_name ?? 'N/A'} />
                  <Divider sx={{ borderColor: '#F1F5F9' }} />
                  <InfoRow label="Email"        value={user?.email ?? 'N/A'} />
                  <Divider sx={{ borderColor: '#F1F5F9' }} />
                  <InfoRow label="Access Level" value={user?.role === 'admin' ? 'Super Administrator' : 'Client Viewer'} highlight />
                </Stack>
              </CardContent>
            </Card>

            {/* Server Info */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TuneRoundedIcon sx={{ fontSize: 18, color: '#6366F1' }} />
                  </Box>
                  <Typography sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A' }}>
                    Server Configuration
                  </Typography>
                </Box>
                <Stack spacing={0} divider={<Divider sx={{ borderColor: '#F1F5F9' }} />}>
                  {serverParams.map((p, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
                      {p.icon}
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {p.label}
                        </Typography>
                        <Typography sx={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 600 }}>
                          {p.value}
                        </Typography>
                      </Box>
                      <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#22C55E' }} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column — Admin Only */}
        {isAdmin && (
          <Grid item xs={12} md={7} lg={8}>
            <Stack spacing={3}>
              {/* Register Form */}
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(20,184,166,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PersonAddRoundedIcon sx={{ fontSize: 18, color: '#14B8A6' }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A' }}>Register New Client</Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8' }}>Create a client login to share project access</Typography>
                    </Box>
                  </Box>

                  {registerStatus && (
                    <Alert
                      severity={registerStatus.type}
                      sx={{ mb: 2.5, borderRadius: '10px' }}
                      onClose={() => setRegisterStatus(null)}
                    >
                      {registerStatus.text}
                    </Alert>
                  )}

                  <form onSubmit={handleRegister}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Full Name" required fullWidth size="small"
                          value={fullName} onChange={e => setFullName(e.target.value)}
                          sx={{ bgcolor: '#FAFAFA', '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Email Address" required fullWidth size="small" type="email"
                          value={email} onChange={e => setEmail(e.target.value)}
                          sx={{ bgcolor: '#FAFAFA', '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Temporary Password" required fullWidth size="small" type="password"
                          value={password} onChange={e => setPassword(e.target.value)}
                          sx={{ bgcolor: '#FAFAFA', '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button
                          type="submit" variant="contained" color="secondary" fullWidth
                          disabled={submitting} sx={{ height: 40, borderRadius: '10px' }}
                        >
                          {submitting ? 'Registering…' : 'Register Client'}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </CardContent>
              </Card>

              {/* Client List */}
              <Card>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2.5, borderBottom: '1px solid #E2E8F0' }}>
                    <GroupRoundedIcon sx={{ color: '#6366F1', fontSize: 20 }} />
                    <Typography sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A' }}>
                      Registered Clients ({clients.length})
                    </Typography>
                  </Box>
                  {clients.length === 0 ? (
                    <Box sx={{ py: 5, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#94A3B8' }}>No clients registered yet.</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Client</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Role</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {clients.map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(20,184,166,0.15)', color: '#0D9488', fontSize: '0.75rem', fontWeight: 700 }}>
                                    {c.full_name?.charAt(0)?.toUpperCase()}
                                  </Avatar>
                                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.full_name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ color: '#64748B', fontSize: '0.875rem' }}>{c.email}</TableCell>
                              <TableCell>
                                <Chip label="CLIENT" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, bgcolor: 'rgba(20,184,166,0.1)', color: '#0D9488' }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Settings;
