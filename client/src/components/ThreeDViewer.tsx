import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, Typography, Paper, ToggleButtonGroup, ToggleButton, Stack, Slider, Chip, FormGroup, FormControlLabel, Switch } from '@mui/material';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import axios from 'axios';
import { API_URL } from '../context/AuthContext';

import Grid3x3Icon from '@mui/icons-material/Grid3x3';
import TerrainIcon from '@mui/icons-material/Terrain';
import CloudDownloadRoundedIcon from '@mui/icons-material/CloudDownloadRounded';
import LayersIcon from '@mui/icons-material/Layers';

import { PointCloudGeometry } from './VolumeCalculator';

interface ThreeDViewerProps {
  projectId: number;
  pointCloudUrl?: string; // Kept for interface compatibility
  onGeometryLoaded?: (geo: PointCloudGeometry) => void;
}

interface LoadedPly {
  name: string;
  geometry: THREE.BufferGeometry;
}

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ projectId, onGeometryLoaded }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  const [renderMode, setRenderMode] = useState<'points' | 'mesh'>('points');
  const [rotationSpeed, setRotationSpeed] = useState<number>(0.5);
  const [stats, setStats] = useState({ points: 0, cameraPitch: 0, cameraYaw: 0 });
  
  const [plyFiles, setPlyFiles] = useState<string[]>([]);
  const [loadedPlys, setLoadedPlys] = useState<LoadedPly[]>([]);
  const [plyVisibility, setPlyVisibility] = useState<Record<string, boolean>>({});
  
  const [serverLoading, setServerLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // 1. Fetch available PLY files list
  useEffect(() => {
    const fetchPlyFiles = async () => {
      try {
        const res = await axios.get(`/api/projects/${projectId}/ply-files`);
        const files: string[] = res.data;
        setPlyFiles(files);
        
        // Initialize visibility to true for all
        const visibility: Record<string, boolean> = {};
        files.forEach(f => visibility[f] = true);
        setPlyVisibility(visibility);
      } catch (err) {
        console.warn('Failed to load PLY files list:', err);
      }
    };
    fetchPlyFiles();
  }, [projectId]);

  // 2. Concurrent Loading of all PLYs
  useEffect(() => {
    if (plyFiles.length === 0) return;
    
    let isCancelled = false;
    setServerLoading(true);
    setLoadingProgress(0);

    const loadAll = async () => {
      const loader = new PLYLoader();
      const loaded: LoadedPly[] = [];
      let loadedCount = 0;

      const loadPromises = plyFiles.map(async (plyName) => {
        try {
          const url = `${API_URL}/static/processed/project_${projectId}/${plyName}`;
          const r = await fetch(url);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const buffer = await r.arrayBuffer();
          if (isCancelled) return;
          
          const geometry = loader.parse(buffer);
          geometry.computeBoundingSphere();
          
          // DO NOT .center() here otherwise each tile centers independently and breaks relative coordinates!
          // We preserve their original coordinate reference frames so they register correctly.
          
          loaded.push({ name: plyName, geometry });
        } catch (err) {
          console.warn(`Could not load PLY ${plyName}:`, err);
        } finally {
          loadedCount++;
          if (!isCancelled) setLoadingProgress(Math.round((loadedCount / plyFiles.length) * 100));
        }
      });

      await Promise.all(loadPromises);

      if (!isCancelled) {
        // Expose geometry to parent for volume calculation (using the first one or combined)
        if (loaded.length > 0 && onGeometryLoaded) {
          const firstGeo = loaded[0].geometry;
          firstGeo.computeBoundingBox();
          const pos = firstGeo.attributes.position;
          onGeometryLoaded({
            vertices: pos ? (pos.array as Float32Array) : new Float32Array(),
            boundingBox: {
              min: { x: firstGeo.boundingBox!.min.x, y: firstGeo.boundingBox!.min.y, z: firstGeo.boundingBox!.min.z },
              max: { x: firstGeo.boundingBox!.max.x, y: firstGeo.boundingBox!.max.y, z: firstGeo.boundingBox!.max.z },
            },
          });
        }
        
        setLoadedPlys(loaded);
        setServerLoading(false);
      }
    };

    loadAll();

    return () => { isCancelled = true; };
  }, [plyFiles, projectId]); // intentionally leaving out onGeometryLoaded to prevent loop

  // 3. Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F8FFF9');

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
    // Adjusted initial camera position to account for non-centered coordinates
    camera.position.set(0, 50, 100);
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

    const activeObjects: THREE.Object3D[] = [];
    let totalPoints = 0;
    
    // Group to hold all PLYs so we can rotate them together
    const plyGroup = new THREE.Group();
    scene.add(plyGroup);

    if (loadedPlys.length > 0) {
      // Calculate overall bounding box to center the group
      const overallBox = new THREE.Box3();

      loadedPlys.forEach((ply) => {
        // Skip if toggled off
        if (plyVisibility[ply.name] === false) return;

        const posAttr = ply.geometry.getAttribute('position');
        if (posAttr) totalPoints += posAttr.count;

        const hasColors = !!ply.geometry.getAttribute('color');
        
        // Ensure bounds are computed for centering
        ply.geometry.computeBoundingBox();
        if (ply.geometry.boundingBox) {
          overallBox.union(ply.geometry.boundingBox);
        }

        let obj: THREE.Object3D;
        if (renderMode === 'points') {
          const mat = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: hasColors,
            color: hasColors ? undefined : 0x10B981,
            transparent: true,
            opacity: 0.92,
          });
          obj = new THREE.Points(ply.geometry, mat);
        } else {
          const mat = new THREE.MeshStandardMaterial({
            color: 0x059669,
            wireframe: true,
            roughness: 0.5,
            metalness: 0.1,
          });
          obj = new THREE.Mesh(ply.geometry, mat);
        }
        
        obj.name = ply.name;
        plyGroup.add(obj);
        activeObjects.push(obj);
      });

      // Center the entire group so it's visible to the camera
      if (!overallBox.isEmpty()) {
        const center = new THREE.Vector3();
        overallBox.getCenter(center);
        plyGroup.position.sub(center); // Move group so center is at (0,0,0)
      }

    } else if (!serverLoading) {
      // Mock terrain if no PLY files loaded yet
      totalPoints = 6000;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(totalPoints * 3);
      const col = new Float32Array(totalPoints * 3);

      for (let i = 0; i < totalPoints; i++) {
        const x = (Math.random() - 0.5) * 20;
        const z = (Math.random() - 0.5) * 20;
        let y = Math.sin(x * 0.4) * Math.cos(z * 0.4) * 2;
        pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
        col[i*3] = 0.9; col[i*3+1] = 0.6; col[i*3+2] = 0.1;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      
      const mat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true });
      const obj = new THREE.Points(geo, mat);
      plyGroup.add(obj);
      activeObjects.push(obj);
    }

    // Animation loop
    let animationId: number;
    let time = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.005 * rotationSpeed;
      plyGroup.rotation.y = time;
      
      setStats({
        points: totalPoints,
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
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // We don't dispose the geometries here because they are cached in loadedPlys state
      activeObjects.forEach(obj => {
        if (obj instanceof THREE.Points) (obj.material as THREE.Material).dispose();
        if (obj instanceof THREE.Mesh) (obj.material as THREE.Material).dispose();
      });
    };
  }, [renderMode, rotationSpeed, loadedPlys, plyVisibility, serverLoading]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 'calc(100vh - 280px)', minHeight: 480, overflow: 'hidden', borderRadius: 3, border: '1px solid #A7F3D0', bgcolor: '#F8FFF9' }}>
      
      {/* Loading overlay */}
      {serverLoading && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(15,26,20,0.85)', zIndex: 20, borderRadius: 3 }}>
          <Typography sx={{ color: '#10B981', fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem' }}>
            ⟳ Loading point clouds... {loadingProgress}%
          </Typography>
        </Box>
      )}

      {/* 3D Canvas */}
      <Box ref={mountRef} sx={{ width: '100%', height: '100%' }} />

      {/* Floating Control Panel */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute', top: 20, right: 20,
          p: 2.5,
          display: 'flex', flexDirection: 'column', gap: 2.2,
          zIndex: 10, width: 280, borderRadius: '14px',
          bgcolor: 'rgba(255,255,255,0.92)',
          border: '1px solid #D1FAE5',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 24px rgba(16,185,129,0.12)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LayersIcon sx={{ color: '#10B981', fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A', flexGrow: 1 }}>
            3D Point Cloud Layers
          </Typography>
          {!serverLoading && loadedPlys.length > 0 && (
            <Chip icon={<CloudDownloadRoundedIcon />} label="Loaded" size="small"
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(16,185,129,0.12)', color: '#059669', '& .MuiChip-icon': { color: '#059669', fontSize: 12 } }}
            />
          )}
        </Box>

        {/* Multi-PLY Layer Toggle Tree */}
        <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
          <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Visibility Toggle
          </Typography>
          {plyFiles.length === 0 ? (
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>No PLY files available.</Typography>
          ) : (
            <FormGroup>
              {plyFiles.map(file => (
                <FormControlLabel
                  key={file}
                  control={
                    <Switch 
                      size="small" 
                      color="success"
                      checked={plyVisibility[file] ?? false}
                      onChange={(e) => setPlyVisibility(prev => ({ ...prev, [file]: e.target.checked }))}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180, display: 'block' }}>
                      {file}
                    </Typography>
                  }
                  sx={{ m: 0, '& .MuiFormControlLabel-label': { ml: 0.5 } }}
                />
              ))}
            </FormGroup>
          )}
        </Box>

        {/* Render Mode Toggle */}
        <Box>
          <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block', mb: 0.8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Representation
          </Typography>
          <ToggleButtonGroup
            value={renderMode} exclusive
            onChange={(_, val) => val && setRenderMode(val)}
            size="small" fullWidth
            sx={{ '& .MuiToggleButton-root': { borderRadius: '8px', py: 0.8, color: '#475569', borderColor: '#D1FAE5', '&.Mui-selected': { bgcolor: 'rgba(16,185,129,0.15)', color: '#059669', borderColor: '#10B981' } } }}
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
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Rotation Speed
            </Typography>
            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>
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
