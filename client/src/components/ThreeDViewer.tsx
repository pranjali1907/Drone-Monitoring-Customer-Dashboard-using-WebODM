import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, Typography, Paper, ToggleButtonGroup, ToggleButton, Stack, Slider, Button } from '@mui/material';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

import Grid3x3Icon from '@mui/icons-material/Grid3x3';
import TerrainIcon from '@mui/icons-material/Terrain';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export const ThreeDViewer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [renderMode, setRenderMode] = useState<'points' | 'mesh'>('points');
  const [rotationSpeed, setRotationSpeed] = useState<number>(0.5);
  const [stats, setStats] = useState({ points: 6000, cameraPitch: -45, cameraYaw: 30 });
  const [loadedGeometry, setLoadedGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [fileName, setFileName] = useState<string>('');

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
        // Center the geometry so it rotates around the origin
        geometry.computeBoundingSphere();
        geometry.center();
        setLoadedGeometry(geometry);
        setRenderMode('points'); // Auto switch to points mode for Point Cloud visualization
      } catch (err) {
        console.error('Error parsing PLY file:', err);
        alert('Failed to parse PLY file. Please ensure it is a valid ASCII or binary .ply file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Setup Scene, Camera, and WebGL Renderer
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F8FAFC'); // Match new light theme page background

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // 2. Add Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(10, 20, 10);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-10, -10, -10);
    scene.add(directionalLight2);

    // Helper references for cleanup
    let pointsGeometry: THREE.BufferGeometry;
    let meshGeometry: THREE.BufferGeometry;
    let pointsMaterial: THREE.PointsMaterial;
    let meshMaterial: THREE.MeshStandardMaterial;
    let activeObject: THREE.Object3D;
    let pointCount = 6000;

    if (loadedGeometry) {
      // Use user-uploaded PLY geometry
      pointsGeometry = loadedGeometry;
      
      // Determine points count
      const posAttr = pointsGeometry.getAttribute('position');
      if (posAttr) pointCount = posAttr.count;

      // Material for loaded point cloud
      // Check if PLY contains color attribute, if not fallback to indigo
      const hasColors = pointsGeometry.getAttribute('color') !== undefined;
      pointsMaterial = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: hasColors,
        color: hasColors ? undefined : 0x6366F1, // fallback to brand indigo
        transparent: true,
        opacity: 0.9,
      });

      // Material for mesh
      meshMaterial = new THREE.MeshStandardMaterial({
        color: 0x6366F1,
        wireframe: true,
        roughness: 0.6,
        metalness: 0.1,
      });

      if (renderMode === 'points') {
        activeObject = new THREE.Points(pointsGeometry, pointsMaterial);
      } else {
        activeObject = new THREE.Mesh(pointsGeometry, meshMaterial);
      }
      scene.add(activeObject);
    } else {
      // Use mock solar wave geometry
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

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const ratio = (y + 2) / 4;
        colors[i * 3] = ratio * 0.1 + 0.38; // Red/Pink
        colors[i * 3 + 1] = ratio * 0.2 + 0.4; // Green
        colors[i * 3 + 2] = (1 - ratio) * 0.5 + 0.5; // Blue
      }

      pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      pointsMaterial = new THREE.PointsMaterial({
        size: 0.18,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
      });

      const mockPointCloud = new THREE.Points(pointsGeometry, pointsMaterial);

      // Create mesh
      meshGeometry = new THREE.PlaneGeometry(20, 20, 40, 40);
      meshGeometry.rotateX(-Math.PI / 2);
      const posAttr = meshGeometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const z = posAttr.getZ(i);
        let y = Math.sin(x * 0.4) * Math.cos(z * 0.4) * 2;
        if (Math.abs(x) < 8 && Math.abs(z) < 8) {
          const gridX = Math.floor(x / 2) * 2;
          const gridZ = Math.floor(z / 2) * 2;
          if ((gridX + gridZ) % 4 === 0) y += 0.8;
        }
        posAttr.setY(i, y);
      }
      meshGeometry.computeVertexNormals();

      meshMaterial = new THREE.MeshStandardMaterial({
        color: 0x475569,
        wireframe: true,
      });

      const mockMesh = new THREE.Mesh(meshGeometry, meshMaterial);

      if (renderMode === 'points') {
        activeObject = mockPointCloud;
      } else {
        activeObject = mockMesh;
      }
      scene.add(activeObject);
    }

    // 3. Animation loop
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

    // 4. Handle Resizing
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 5. Cleanup Hook
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (pointsGeometry) pointsGeometry.dispose();
      if (pointsMaterial) pointsMaterial.dispose();
      if (meshGeometry) meshGeometry.dispose();
      if (meshMaterial) meshMaterial.dispose();
    };
  }, [renderMode, rotationSpeed, loadedGeometry]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 'calc(100vh - 280px)', minHeight: 480, overflow: 'hidden', borderRadius: 3, border: '1px solid #E2E8F0' }}>
      {/* 3D Canvas Mounting Point */}
      <Box ref={mountRef} sx={{ width: '100%', height: '100%' }} />

      {/* Floating Panel (Right) */}
      <Paper
        elevation={4}
        className="glass-panel"
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.2,
          zIndex: 10,
          width: 260,
          borderRadius: '14px',
          bgcolor: 'rgba(255,255,255,0.9)',
          border: '1px solid #E2E8F0',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A' }}>
          3D Point Cloud Panel
        </Typography>

        {/* .PLY Uploader */}
        <Box>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Source Dataset
          </Typography>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<CloudUploadIcon />}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              borderColor: '#E2E8F0',
              color: '#475569',
              fontSize: '0.82rem',
              '&:hover': { borderColor: '#6366F1', color: '#6366F1', bgcolor: 'rgba(99,102,241,0.04)' },
            }}
          >
            Upload .PLY Cloud
            <input type="file" accept=".ply" hidden onChange={handleFileChange} />
          </Button>
          {fileName && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.8, color: '#10B981', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ✓ {fileName}
            </Typography>
          )}
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Representation
          </Typography>
          <ToggleButtonGroup
            value={renderMode}
            exclusive
            onChange={(_, val) => val && setRenderMode(val)}
            size="small"
            fullWidth
            sx={{ '& .MuiToggleButton-root': { borderRadius: '8px', py: 0.8 } }}
          >
            <ToggleButton value="points">
              <Grid3x3Icon fontSize="small" sx={{ mr: 0.5 }} /> Points
            </ToggleButton>
            <ToggleButton value="mesh">
              <TerrainIcon fontSize="small" sx={{ mr: 0.5 }} /> Wireframe
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Rotation Speed
            </Typography>
            <Typography variant="caption" sx={{ color: '#6366F1', fontWeight: 700 }}>
              {rotationSpeed.toFixed(1)}x
            </Typography>
          </Box>
          <Slider
            value={rotationSpeed}
            onChange={(_, val) => setRotationSpeed(val as number)}
            min={0}
            max={2}
            step={0.1}
            size="small"
          />
        </Box>
      </Paper>

      {/* Stats Overlay (Bottom Left) */}
      <Paper
        elevation={0}
        sx={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          p: 1.5,
          bgcolor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 10,
          borderRadius: '10px',
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.72rem' }}>
            RENDERER: <span style={{ color: '#fff', fontWeight: 700 }}>WebGL 2.0 (Three.js)</span>
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.72rem' }}>
            VERTICES: <span style={{ color: '#10B981', fontWeight: 700 }}>{stats.points.toLocaleString()}</span>
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.72rem' }}>
            CAMERA YAW: <span style={{ color: '#6366F1', fontWeight: 700 }}>{stats.cameraYaw}°</span>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ThreeDViewer;
