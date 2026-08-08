import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, Typography, Paper, ToggleButtonGroup, ToggleButton, Stack, Slider, Button, Chip } from '@mui/material';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

import Grid3x3Icon from '@mui/icons-material/Grid3x3';
import TerrainIcon from '@mui/icons-material/Terrain';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadRoundedIcon from '@mui/icons-material/CloudDownloadRounded';

interface ThreeDViewerProps {
  /** Optional URL to a server-saved .ply file — auto-loads on mount when provided */
  pointCloudUrl?: string;
}

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ pointCloudUrl }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [renderMode, setRenderMode] = useState<'points' | 'mesh'>('points');
  const [rotationSpeed, setRotationSpeed] = useState<number>(0.5);
  const [stats, setStats] = useState({ points: 6000, cameraPitch: -45, cameraYaw: 30 });
  const [loadedGeometry, setLoadedGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [serverLoading, setServerLoading] = useState(false);
  const [serverLoaded, setServerLoaded] = useState(false);

  // ── Auto-load from server URL on mount ──────────────────────────────────
  useEffect(() => {
    if (!pointCloudUrl) return;
    setServerLoading(true);
    fetch(pointCloudUrl)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then(buffer => {
        const loader = new PLYLoader();
        const geometry = loader.parse(buffer);
        geometry.computeBoundingSphere();
        geometry.center();
        setLoadedGeometry(geometry);
        setServerLoaded(true);
        setFileName('point_cloud.ply (server)');
      })
      .catch(err => {
        console.warn('Could not load server PLY:', err);
      })
      .finally(() => setServerLoading(false));
  }, [pointCloudUrl]);

  // ── Local file upload handler ────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const contents = event.target?.result as ArrayBuffer;
      const loader = new PLYLoader();
      try {
        const geometry = loader.parse(contents);
        geometry.computeBoundingSphere();
        geometry.center();
        setLoadedGeometry(geometry);
        setServerLoaded(false);
        setRenderMode('points');
      } catch (err) {
        console.error('Error parsing PLY file:', err);
        alert('Failed to parse PLY file. Please ensure it is a valid ASCII or binary .ply file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Three.js Scene ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0F1A14'); // Deep forest dark background

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dLight1.position.set(10, 20, 10);
    scene.add(dLight1);
    const dLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dLight2.position.set(-10, -10, -10);
    scene.add(dLight2);

    let pointsGeometry: THREE.BufferGeometry;
    let meshGeometry: THREE.BufferGeometry | undefined;
    let pointsMaterial: THREE.PointsMaterial;
    let meshMaterial: THREE.MeshStandardMaterial;
    let activeObject: THREE.Object3D;
    let pointCount = 6000;

    if (loadedGeometry) {
      // ── Loaded PLY geometry ────────────────────────────────
      pointsGeometry = loadedGeometry;
      const posAttr = pointsGeometry.getAttribute('position');
      if (posAttr) pointCount = posAttr.count;

      const hasColors = !!pointsGeometry.getAttribute('color');
      pointsMaterial = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: hasColors,
        color: hasColors ? undefined : 0x10B981, // Emerald fallback
        transparent: true,
        opacity: 0.92,
      });
      meshMaterial = new THREE.MeshStandardMaterial({
        color: 0x059669,
        wireframe: true,
        roughness: 0.5,
        metalness: 0.1,
      });

      activeObject = renderMode === 'points'
        ? new THREE.Points(pointsGeometry, pointsMaterial)
        : new THREE.Mesh(pointsGeometry, meshMaterial);
      scene.add(activeObject);

    } else {
      // ── Mock Emerald Survey Terrain ────────────────────────
      pointsGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(pointCount * 3);
      const colors = new Float32Array(pointCount * 3);

      for (let i = 0; i < pointCount; i++) {
        const x = (Math.random() - 0.5) * 20;
        const z = (Math.random() - 0.5) * 20;
        let y = Math.sin(x * 0.4) * Math.cos(z * 0.4) * 2;

        if (Math.abs(x) < 8 && Math.abs(z) < 8) {
          const gridX = Math.floor(x / 2) * 2;
          const gridZ = Math.floor(z / 2) * 2;
          if ((gridX + gridZ) % 4 === 0) y += 0.8;
        }

        positions[i * 3]     = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Emerald → Amber gradient based on height
        const ratio = (y + 2) / 4;
        colors[i * 3]     = ratio * 0.95 + 0.05; // R (amber highlights)
        colors[i * 3 + 1] = 0.72 - ratio * 0.25; // G (green to gold)
        colors[i * 3 + 2] = ratio * 0.05;         // B (minimal)
      }

      pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      pointsMaterial = new THREE.PointsMaterial({
        size: 0.18,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
      });

      meshGeometry = new THREE.PlaneGeometry(20, 20, 40, 40);
      meshGeometry.rotateX(-Math.PI / 2);
      const posAttrM = meshGeometry.attributes.position;
      for (let i = 0; i < posAttrM.count; i++) {
        const x = posAttrM.getX(i);
        const z = posAttrM.getZ(i);
        let y = Math.sin(x * 0.4) * Math.cos(z * 0.4) * 2;
        if (Math.abs(x) < 8 && Math.abs(z) < 8) {
          const gridX = Math.floor(x / 2) * 2;
          const gridZ = Math.floor(z / 2) * 2;
          if ((gridX + gridZ) % 4 === 0) y += 0.8;
        }
        posAttrM.setY(i, y);
      }
      meshGeometry.computeVertexNormals();

      meshMaterial = new THREE.MeshStandardMaterial({
        color: 0x059669,
        wireframe: true,
      });

      activeObject = renderMode === 'points'
        ? new THREE.Points(pointsGeometry, pointsMaterial)
        : new THREE.Mesh(meshGeometry, meshMaterial);
      scene.add(activeObject);
    }

    // Animation loop
    let animationId: number;
    let time = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.005 * rotationSpeed;
      activeObject.rotation.y = time;
      setStats({
        points: pointCount,
        cameraPitch: Math.round(camera.position.y * 3),
        cameraYaw: Math.round(time * (180 / Math.PI)) % 360,
      });
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        mountRef.current.removeChild(renderer.domElement);
      }
      pointsGeometry?.dispose();
      pointsMaterial?.dispose();
      meshGeometry?.dispose();
      meshMaterial?.dispose();
      renderer.dispose();
    };
  }, [renderMode, rotationSpeed, loadedGeometry]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 'calc(100vh - 280px)', minHeight: 480, overflow: 'hidden', borderRadius: 3, border: '1px solid #D1FAE5' }}>
      {/* Loading overlay */}
      {serverLoading && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(15,26,20,0.85)', zIndex: 20, borderRadius: 3 }}>
          <Typography sx={{ color: '#34D399', fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem' }}>
            ⟳ Loading point cloud from server…
          </Typography>
        </Box>
      )}

      {/* 3D Canvas */}
      <Box ref={mountRef} sx={{ width: '100%', height: '100%' }} />

      {/* Floating Control Panel */}
      <Paper
        elevation={4}
        sx={{
          position: 'absolute', top: 20, right: 20,
          p: 2.5,
          display: 'flex', flexDirection: 'column', gap: 2.2,
          zIndex: 10, width: 270, borderRadius: '14px',
          bgcolor: 'rgba(15,26,20,0.88)',
          border: '1px solid rgba(16,185,129,0.25)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#ECFDF5', flexGrow: 1 }}>
            3D Point Cloud Panel
          </Typography>
          {serverLoaded && (
            <Chip icon={<CloudDownloadRoundedIcon />} label="Server" size="small"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(16,185,129,0.2)', color: '#34D399', '& .MuiChip-icon': { color: '#34D399', fontSize: 12 } }}
            />
          )}
        </Box>

        {/* Local .PLY Upload */}
        <Box>
          <Typography variant="caption" sx={{ color: '#6EE7B7', fontWeight: 700, display: 'block', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Upload Local .PLY
          </Typography>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<CloudUploadIcon />}
            sx={{
              borderRadius: '10px', textTransform: 'none',
              borderColor: 'rgba(16,185,129,0.3)', color: '#6EE7B7', fontSize: '0.82rem',
              '&:hover': { borderColor: '#10B981', bgcolor: 'rgba(16,185,129,0.1)' },
            }}
          >
            Choose .PLY File
            <input type="file" accept=".ply" hidden onChange={handleFileChange} />
          </Button>
          {fileName && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.8, color: '#10B981', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ✓ {fileName}
            </Typography>
          )}
        </Box>

        {/* Render Mode Toggle */}
        <Box>
          <Typography variant="caption" sx={{ color: '#6EE7B7', fontWeight: 700, display: 'block', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Representation
          </Typography>
          <ToggleButtonGroup
            value={renderMode} exclusive
            onChange={(_, val) => val && setRenderMode(val)}
            size="small" fullWidth
            sx={{ '& .MuiToggleButton-root': { borderRadius: '8px', py: 0.8, color: '#6EE7B7', borderColor: 'rgba(16,185,129,0.3)', '&.Mui-selected': { bgcolor: 'rgba(16,185,129,0.25)', color: '#34D399' } } }}
          >
            <ToggleButton value="points">
              <Grid3x3Icon fontSize="small" sx={{ mr: 0.5 }} /> Points
            </ToggleButton>
            <ToggleButton value="mesh">
              <TerrainIcon fontSize="small" sx={{ mr: 0.5 }} /> Wireframe
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Rotation Speed */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#6EE7B7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Rotation Speed
            </Typography>
            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700 }}>
              {rotationSpeed.toFixed(1)}x
            </Typography>
          </Box>
          <Slider
            value={rotationSpeed}
            onChange={(_, val) => setRotationSpeed(val as number)}
            min={0} max={2} step={0.1} size="small"
            sx={{ color: '#10B981', '& .MuiSlider-rail': { bgcolor: 'rgba(16,185,129,0.2)' } }}
          />
        </Box>
      </Paper>

      {/* Stats Overlay */}
      <Paper
        elevation={0}
        sx={{
          position: 'absolute', bottom: 20, left: 20,
          p: 1.5, zIndex: 10, borderRadius: '10px',
          bgcolor: 'rgba(10,26,18,0.9)',
          border: '1px solid rgba(16,185,129,0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="caption" sx={{ color: '#4B5563', fontFamily: 'monospace', fontSize: '0.72rem' }}>
            RENDERER: <span style={{ color: '#E5E7EB', fontWeight: 700 }}>WebGL 2.0 (Three.js)</span>
          </Typography>
          <Typography variant="caption" sx={{ color: '#4B5563', fontFamily: 'monospace', fontSize: '0.72rem' }}>
            VERTICES: <span style={{ color: '#10B981', fontWeight: 700 }}>{stats.points.toLocaleString()}</span>
          </Typography>
          <Typography variant="caption" sx={{ color: '#4B5563', fontFamily: 'monospace', fontSize: '0.72rem' }}>
            CAMERA YAW: <span style={{ color: '#F59E0B', fontWeight: 700 }}>{stats.cameraYaw}°</span>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ThreeDViewer;
