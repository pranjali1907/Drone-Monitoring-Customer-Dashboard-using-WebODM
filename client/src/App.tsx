import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, Box, CssBaseline, Toolbar } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';

// Layout Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Page Components
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { CreateProject } from './pages/CreateProject';
import { ProjectDetails } from './pages/ProjectDetails';
import { Settings } from './pages/Settings';

const drawerWidth = 248;

// ── Dashboard Shell Layout ────────────────────────────────────────────
const DashboardLayout: React.FC = () => (
  <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
    <Navbar />
    <Sidebar />
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#F1F5F9',
      }}
    >
      <Toolbar sx={{ minHeight: '64px !important' }} />
      <Box sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="dashboard"        element={<Dashboard />} />
          <Route path="projects"         element={<Projects />} />
          <Route path="projects/:id"     element={<ProjectDetails />} />
          <Route path="projects/create"  element={<CreateProject />} />
          <Route path="settings"         element={<Settings />} />
          <Route path=""                 element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Box>
    </Box>
  </Box>
);

// ── Root App ──────────────────────────────────────────────────────────
export const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* /login redirects straight to dashboard — no login screen */}
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/*" element={<DashboardLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
