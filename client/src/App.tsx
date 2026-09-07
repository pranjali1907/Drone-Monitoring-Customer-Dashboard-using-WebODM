import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, Box, CssBaseline, Toolbar } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { CreateProject } from './pages/CreateProject';
import { ProjectDetails } from './pages/ProjectDetails';
import SplitViewer from './pages/SplitViewer';

const drawerWidth = 248;

const DashboardLayout: React.FC = () => (
  <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F1F5F9' }}>
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
      }}
    >
      <Toolbar sx={{ minHeight: '64px !important' }} />
      <Box sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="dashboard"        element={<Dashboard />} />
          <Route path="projects"         element={<Projects />} />
          <Route path="projects/create"  element={<CreateProject />} />
          <Route path="projects/:id"     element={<ProjectDetails />} />
          <Route path="compare"          element={<SplitViewer />} />
          <Route path=""                 element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Box>
    </Box>
  </Box>
);

export const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<DashboardLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
