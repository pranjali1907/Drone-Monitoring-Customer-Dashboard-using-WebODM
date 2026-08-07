import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, Typography, Paper, ToggleButtonGroup, ToggleButton, Stack, Slider } from '@mui/material';

import Grid3x3Icon from '@mui/icons-material/Grid3x3';
import TerrainIcon from '@mui/icons-material/Terrain';

export const ThreeDViewer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [renderMode, setRenderMode] = useState<'points' | 'mesh'>('points');
  const [rotationSpeed, setRotationSpeed] = useState<number>(0.5);
  const [stats, setStats] = useState({ points: 2500, cameraPitch: -45, cameraYaw: 30 });

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Setup Scene, Camera, and WebGL Renderer
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0e17');

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // 2. Add Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0x3b82f6, 1.2); // Cyan glow
    directionalLight1.position.set(10, 20, 10);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x10b981, 0.8); // Green glow
    directionalLight2.position.set(-10, -5, -10);
    scene.add(directionalLight2);

    // 3. Create Point Cloud Geometry
    const pointCount = 6000;
    const pointsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);

    // Create a terrain-like wave structure representing solar panels and landscape
    for (let i = 0; i < pointCount; i++) {
      const x = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      
      // Terrain contour math formula
      let y = Math.sin(x * 0.4) * Math.cos(z * 0.4) * 2;
      
      // Add mini box-like features representing arrays of solar panels
      if (Math.abs(x) < 8 && Math.abs(z) < 8) {
        const gridX = Math.floor(x / 2) * 2;
        const gridZ = Math.floor(z / 2) * 2;
        if ((gridX + gridZ) % 4 === 0) {
          y += 0.8; // Raised block
        }
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color coding by height (Red-Green-Blue gradient map)
      const ratio = (y + 2) / 4;
      colors[i * 3] = ratio * 0.2 + 0.1; // R
      colors[i * 3 + 1] = ratio * 0.6 + 0.4; // G
      colors[i * 3 + 2] = (1 - ratio) * 0.8 + 0.2; // B
    }

    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    const pointCloud = new THREE.Points(pointsGeometry, pointsMaterial);

    // 4. Create Terrain Mesh Geometry
    const meshGeometry = new THREE.PlaneGeometry(20, 20, 40, 40);
    meshGeometry.rotateX(-Math.PI / 2);

    const posAttr = meshGeometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      let y = Math.sin(x * 0.4) * Math.cos(z * 0.4) * 2;
      
      // Solar arrays blocks
      if (Math.abs(x) < 8 && Math.abs(z) < 8) {
        const gridX = Math.floor(x / 2) * 2;
        const gridZ = Math.floor(z / 2) * 2;
        if ((gridX + gridZ) % 4 === 0) {
          y += 0.8;
        }
      }
      posAttr.setY(i, y);
    }
    meshGeometry.computeVertexNormals();

    const meshMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f3e46,
      wireframe: true,
      roughness: 0.5,
      metalness: 0.2,
    });

    const terrainMesh = new THREE.Mesh(meshGeometry, meshMaterial);

    // Initial load selection
    if (renderMode === 'points') {
      scene.add(pointCloud);
    } else {
      scene.add(terrainMesh);
    }

    // 5. Animation loop
    let animationId: number;
    let time = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.005 * rotationSpeed;

      // Rotate active 3D model
      if (renderMode === 'points') {
        pointCloud.rotation.y = time;
      } else {
        terrainMesh.rotation.y = time;
      }

      // Sync camera stats
      setStats({
        points: renderMode === 'points' ? pointCount : 3200,
        cameraPitch: Math.round(camera.position.y * 3),
        cameraYaw: Math.round(time * (180 / Math.PI)) % 360,
      });

      renderer.render(scene, camera);
    };
    animate();

    // 6. Handle Resizing
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 7. Cleanup Hook
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      meshGeometry.dispose();
      meshMaterial.dispose();
    };
  }, [renderMode, rotationSpeed]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 'calc(100vh - 280px)', minHeight: 480, overflow: 'hidden', borderRadius: 3 }}>
      {/* 3D Canvas Mounting Point */}
      <Box ref={mountRef} sx={{ width: '100%', height: '100%' }} />

      {/* Floating Mode Switcher */}
      <Paper
        elevation={6}
        className="glass-panel"
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          zIndex: 10,
          width: 240,
          borderRadius: 3,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          3D Rendering Panel
        </Typography>

        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
            REPRESENTATION
          </Typography>
          <ToggleButtonGroup
            value={renderMode}
            exclusive
            onChange={(_, val) => val && setRenderMode(val)}
            size="small"
            fullWidth
          >
            <ToggleButton value="points">
              <Grid3x3Icon fontSize="small" sx={{ mr: 0.5 }} /> Points
            </ToggleButton>
            <ToggleButton value="mesh">
              <TerrainIcon fontSize="small" sx={{ mr: 0.5 }} /> Mesh
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              ROTATION SPEED
            </Typography>
            <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 700 }}>
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

      {/* Engineering Stats Dashboard overlay (Bottom Left) */}
      <Paper
        elevation={0}
        sx={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          p: 1.5,
          bgcolor: 'rgba(10, 14, 23, 0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          zIndex: 10,
          borderRadius: 2,
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
            DEVICE: <span style={{ color: '#fff' }}>WebGL 2.0 Renderer</span>
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
            POINTS COUNT: <span style={{ color: '#10b981', fontWeight: 600 }}>{stats.points.toLocaleString()}</span>
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
            ROTATION YAW: <span style={{ color: '#3b82f6', fontWeight: 600 }}>{stats.cameraYaw}°</span>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};
export default ThreeDViewer;
