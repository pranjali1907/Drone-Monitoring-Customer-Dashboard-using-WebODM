import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Tabs, Tab, CircularProgress, Card, CardContent,
  Grid, Button, Chip, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../context/AuthContext';

import MapView from '../components/MapView';
import ThreeDViewer from '../components/ThreeDViewer';
import UploadManager from '../components/UploadManager';
import ComparisonSlider from '../components/ComparisonSlider';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import CompareRoundedIcon from '@mui/icons-material/CompareRounded';
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded';
import VideoLibraryRoundedIcon from '@mui/icons-material/VideoLibraryRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import BrokenImageRoundedIcon from '@mui/icons-material/BrokenImageRounded';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  completed:  { label: 'Completed',  bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
  processing: { label: 'Processing', bg: '#EDE9FE', color: '#5B21B6', dot: '#8B5CF6' },
  pending:    { label: 'Pending',    bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  draft:      { label: 'Draft',      bg: '#F1F5F9', color: '#475569', dot: '#94A3B8' },
  failed:     { label: 'Failed',     bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index} id={`tab-${index}`}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const EmptyPanel: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <Box sx={{ textAlign: 'center', py: 8 }}>
    <Box sx={{ width: 72, height: 72, bgcolor: '#F1F5F9', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
      {icon}
    </Box>
    <Typography sx={{ fontWeight: 700, color: '#475569', mb: 0.5 }}>{title}</Typography>
    <Typography variant="body2" sx={{ color: '#94A3B8' }}>{subtitle}</Typography>
  </Box>
);

export const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  const fetchProjectDetails = async () => {
    try {
      const res = await axios.get(`/api/projects/${id}`);
      setProject(res.data);
    } catch {
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjectDetails(); }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '75vh', gap: 2 }}>
        <CircularProgress sx={{ color: '#6366F1' }} size={42} thickness={4} />
        <Typography sx={{ color: '#94A3B8', fontSize: '0.9rem' }}>Loading project…</Typography>
      </Box>
    );
  }

  if (!project) return null;

  const sc = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;

  const tabs = [
    { icon: <MapRoundedIcon />, label: '2D Orthomap' },
    { icon: <ViewInArRoundedIcon />, label: '3D Model' },
    { icon: <CompareRoundedIcon />, label: 'Before/After' },
    { icon: <PhotoLibraryRoundedIcon />, label: `Images (${project.images?.length ?? 0})` },
    { icon: <VideoLibraryRoundedIcon />, label: `Videos (${project.videos?.length ?? 0})` },
    { icon: <AssessmentRoundedIcon />, label: 'Downloads' },
    ...(isAdmin ? [{ icon: <CloudUploadRoundedIcon />, label: 'Admin Pipeline' }] : []),
  ];

  return (
    <Box className="page-enter" sx={{ py: 3.5, px: { xs: 2, md: 3 } }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/projects')}
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ borderRadius: '10px', borderColor: '#E2E8F0', color: '#475569', flexShrink: 0, mt: 0.5 }}
        >
          Back
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
              {project.name}
            </Typography>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 1.2, py: 0.4, borderRadius: '20px',
              bgcolor: sc.bg, color: sc.color, fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Outfit',
            }}>
              <RadioButtonCheckedRoundedIcon sx={{ fontSize: 8, color: sc.dot }} />
              {sc.label}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
            {project.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOnRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>{project.location}</Typography>
              </Box>
            )}
            {project.survey_date && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarMonthRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
                  {new Date(project.survey_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Tab Bar ──────────────────────────────────────────── */}
      <Card sx={{ mb: 3, overflow: 'visible' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1.5,
            '& .MuiTab-root': {
              fontFamily: 'Outfit', fontWeight: 600, fontSize: '0.875rem',
              minHeight: 52, py: 1.5, px: 2, gap: 0.75,
              color: '#64748B', textTransform: 'none',
              '&.Mui-selected': { color: '#6366F1', fontWeight: 700 },
            },
            '& .MuiTabs-indicator': { backgroundColor: '#6366F1', height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          {tabs.map((t, i) => (
            <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />
          ))}
        </Tabs>
      </Card>

      {/* ── Tab 0: 2D Map ───────────────────────────────────── */}
      <TabPanel value={activeTab} index={0}>
        <MapView
          projectId={project.id}
          latitude={project.latitude || 35.0592}
          longitude={project.longitude || -118.1622}
          boundaryGeoJson={project.boundary}
          hasOrthophoto={project.status === 'completed'}
        />
      </TabPanel>

      {/* ── Tab 1: 3D Viewer ─────────────────────────────────── */}
      <TabPanel value={activeTab} index={1}>
        {project.status === 'completed' ? (
          <ThreeDViewer />
        ) : (
          <EmptyPanel
            icon={<ViewInArRoundedIcon sx={{ fontSize: 36, color: '#CBD5E1' }} />}
            title="3D model not available"
            subtitle="Run WebODM alignment first to generate 3D mesh and point cloud outputs."
          />
        )}
      </TabPanel>

      {/* ── Tab 2: Comparison Slider ─────────────────────────── */}
      <TabPanel value={activeTab} index={2}>
        <ComparisonSlider projectId={project.id} />
      </TabPanel>

      {/* ── Tab 3: Image Gallery ─────────────────────────────── */}
      <TabPanel value={activeTab} index={3}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
            Survey Image Gallery
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Raw geotagged camera frames captured during the flight path survey.
          </Typography>
        </Box>
        {!project.images?.length ? (
          <EmptyPanel
            icon={<PhotoLibraryRoundedIcon sx={{ fontSize: 36, color: '#CBD5E1' }} />}
            title="No images uploaded"
            subtitle="Upload survey images via the Admin Pipeline tab."
          />
        ) : (
          <Grid container spacing={2}>
            {project.images.map((img: any) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={img.id}>
                <Card sx={{ overflow: 'hidden' }}>
                  <Box sx={{ position: 'relative', height: 180, bgcolor: '#F8FAFC' }}>
                    {imgErrors[img.id] ? (
                      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <BrokenImageRoundedIcon sx={{ fontSize: 36, color: '#CBD5E1' }} />
                        <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>Preview unavailable</Typography>
                      </Box>
                    ) : (
                      <Box
                        component="img"
                        src={`${API_URL}/${img.filepath}`}
                        alt={img.filename}
                        onError={() => setImgErrors(prev => ({ ...prev, [img.id]: true }))}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )}
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <Chip
                        label={`${img.altitude ?? 120}m`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff' }}
                      />
                    </Box>
                  </Box>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.filename}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                      {img.latitude?.toFixed(5)}, {img.longitude?.toFixed(5)} · {(img.filesize / 1024).toFixed(0)} KB
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* ── Tab 4: Video ─────────────────────────────────────── */}
      <TabPanel value={activeTab} index={4}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
            Drone Flight Videos
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Thermal or optical video logs recorded during the aerial survey.
          </Typography>
        </Box>
        {!project.videos?.length ? (
          <EmptyPanel
            icon={<VideoLibraryRoundedIcon sx={{ fontSize: 36, color: '#CBD5E1' }} />}
            title="No videos uploaded"
            subtitle="Upload drone flight videos via the Admin Pipeline tab."
          />
        ) : (
          <Grid container spacing={3} justifyContent="center">
            {project.videos.map((vid: any) => (
              <Grid item xs={12} md={9} key={vid.id}>
                <Card sx={{ overflow: 'hidden' }}>
                  <video
                    controls
                    src={`${API_URL}/${vid.filepath}`}
                    style={{ width: '100%', display: 'block', maxHeight: 480, backgroundColor: '#0F172A' }}
                  />
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'Outfit', color: '#0F172A', mb: 0.5 }}>
                      {vid.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>MP4 format</Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>Duration: {vid.duration ?? 65}s</Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>Size: {(vid.filesize / (1024 * 1024)).toFixed(1)} MB</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* ── Tab 5: Downloads ─────────────────────────────────── */}
      <TabPanel value={activeTab} index={5}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
            Survey Deliverables & Downloads
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Download WebODM outputs — GeoTIFF orthophotos, DSM/DTM rasters, 3D mesh, LAS point clouds.
          </Typography>
        </Box>
        {!project.orthophotos?.length && !project.reports?.length ? (
          <EmptyPanel
            icon={<AssessmentRoundedIcon sx={{ fontSize: 36, color: '#CBD5E1' }} />}
            title="No downloads available"
            subtitle="Orthophoto products will appear here after WebODM processing completes."
          />
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '14px' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Document / Asset</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell align="right">Download</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {project.orthophotos?.flatMap((ortho: any) => [
                  { name: 'Processed Orthophoto Map', type: 'Raster GeoTIFF', ext: 'TIF', path: ortho.orthophoto_path, color: '#6366F1' },
                  { name: 'Digital Surface Model (DSM)', type: 'Elevation Raster', ext: 'TIF', path: ortho.dsm_path, color: '#14B8A6' },
                  { name: 'Digital Terrain Model (DTM)', type: 'Elevation Raster', ext: 'TIF', path: ortho.dtm_path, color: '#14B8A6' },
                  { name: '3D Textured Mesh', type: '3D Mesh Object', ext: 'OBJ/ZIP', path: ortho.model_3d_path, color: '#F59E0B' },
                  { name: 'LAS Point Cloud', type: 'Point Cloud', ext: 'LAZ', path: ortho.point_cloud_path, color: '#8B5CF6' },
                ].map((dl, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontWeight: 600, color: '#0F172A' }}>{dl.name}</TableCell>
                    <TableCell sx={{ color: '#64748B' }}>{dl.type}</TableCell>
                    <TableCell>
                      <Chip label={dl.ext} size="small" sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700, bgcolor: `${dl.color}15`, color: dl.color }} />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined" size="small"
                        href={`${API_URL}/${dl.path}`} download
                        startIcon={<DownloadRoundedIcon />}
                        sx={{ borderRadius: '8px', borderColor: '#E2E8F0', color: '#475569', '&:hover': { borderColor: '#6366F1', color: '#6366F1' } }}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                )))}
                {project.reports?.map((rep: any) => (
                  <TableRow key={rep.id}>
                    <TableCell sx={{ fontWeight: 600, color: '#0F172A' }}>{rep.title}</TableCell>
                    <TableCell sx={{ color: '#64748B' }}>Survey Report</TableCell>
                    <TableCell>
                      <Chip
                        label={rep.report_type.toUpperCase()}
                        size="small"
                        sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700,
                          bgcolor: rep.report_type === 'pdf' ? '#FEE2E2' : '#DCFCE7',
                          color: rep.report_type === 'pdf' ? '#991B1B' : '#166534' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined" size="small"
                        href={`${API_URL}/${rep.filepath}`} download
                        startIcon={<DownloadRoundedIcon />}
                        sx={{ borderRadius: '8px', borderColor: '#E2E8F0', color: '#475569', '&:hover': { borderColor: '#6366F1', color: '#6366F1' } }}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* ── Tab 6: Admin Pipeline ────────────────────────────── */}
      {isAdmin && (
        <TabPanel value={activeTab} index={6}>
          <UploadManager
            projectId={project.id}
            onUploadSuccess={fetchProjectDetails}
            currentStatus={project.status}
          />
        </TabPanel>
      )}
    </Box>
  );
};

export default ProjectDetails;
