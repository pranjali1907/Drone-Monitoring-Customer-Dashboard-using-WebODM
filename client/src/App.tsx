import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, Box, CssBaseline, Toolbar } from '@mui/material';
import { theme } from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Page Components
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { CreateProject } from './pages/CreateProject';
import { ProjectDetails } from './pages/ProjectDetails';
import { Settings } from './pages/Settings';

const drawerWidth = 248;

// ── Protected Route Guard ─────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: '100vh', bgcolor: '#F1F5F9',
        }}
      >
        {/* Intentionally blank while auto-login completes */}
      </Box>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

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
          <Route path="dashboard"         element={<Dashboard />} />
          <Route path="projects"          element={<Projects />} />
          <Route path="projects/:id"      element={<ProjectDetails />} />
          <Route path="projects/create"   element={
            <ProtectedRoute adminOnly>
              <CreateProject />
            </ProtectedRoute>
          } />
          <Route path="settings"          element={<Settings />} />
          <Route path=""                  element={<Navigate to="dashboard" replace />} />
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
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
