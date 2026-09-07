import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Box, Paper, Typography, Stack, Switch, FormControlLabel,
  Slider, Chip, CircularProgress, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import ViewInArIcon from '@mui/icons-material/ViewInAr';

interface PlyLayer {
  id: number;
  drive_file_id: string;
  name: string;
  status: string;
}

interface LoadedMesh {
  name: string;
  object: THREE.Object3D;
  visible: boolean;
  pointSize: number;
}

interface ThreeDViewerProps {
  layers: PlyLayer[];
}

const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ layers }) => {
  const mountRef   = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef   = useRef<THREE.Scene | null>(null);
  const cameraRef  = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);

  const [loadedMeshes, setLoadedMeshes] = useState<LoadedMesh[]>([]);
  const [loading, setLoading]           = useState(false);
  const [progress, setProgress]         = useState(0);
  const [renderMode, setRenderMode]     = useState<'points' | 'mesh'>('points');
  const [pointCount, setPointCount]     = useState(0);

  const readyLayers = layers.filter(l => l.status === 'READY' && l.drive_file_id);

  // ── Build Three.js scene ─────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const { clientWidth: w, clientHeight: h } = el;

    const scene    = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1a12);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.001, 100000);
    camera.position.set(0, 30, 60);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(10, 30, 10);
    scene.add(dir);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const { clientWidth: nw, clientHeight: nh } = el;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  // ── Load PLY files ───────────────────────────────────────────────────
  useEffect(() => {
    if (readyLayers.length === 0 || !sceneRef.current) return;
    setLoading(true);
    setProgress(0);
    const scene = sceneRef.current;

    // Remove old objects
    scene.children
      .filter(c => c.name.startsWith('ply_'))
      .forEach(c => scene.remove(c));

    const loader = new PLYLoader();
    let loaded = 0;
    const meshResults: LoadedMesh[] = [];
    let centroidOffset: THREE.Vector3 | null = null;
    let totalPoints = 0;

    const loadAll = async () => {
      for (let idx = 0; idx < readyLayers.length; idx++) {
        const layer = readyLayers[idx];
        const url   = `/api/projects/proxy-drive?file_id=${layer.drive_file_id}`;
        try {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const buffer = await resp.arrayBuffer();
          const geo    = loader.parse(buffer);
          geo.computeBoundingBox();

          // ── Centroid drift fix ──────────────────────────────────────
          // Compute centroid from first (primary) PLY and apply to all
          if (idx === 0 && geo.boundingBox) {
            centroidOffset = new THREE.Vector3();
            geo.boundingBox.getCenter(centroidOffset);
          }
          if (centroidOffset) {
            const posAttr = geo.getAttribute('position');
            const arr = posAttr.array as Float32Array;
            for (let i = 0; i < arr.length; i += 3) {
              arr[i]     -= centroidOffset.x;
              arr[i + 1] -= centroidOffset.y;
              arr[i + 2] -= centroidOffset.z;
            }
            (posAttr as THREE.BufferAttribute).needsUpdate = true;
            geo.computeBoundingBox();
            geo.computeBoundingSphere();
          }

          const hasColors = !!geo.getAttribute('color');
          totalPoints += (geo.getAttribute('position')?.count ?? 0);

          let obj: THREE.Object3D;
          if (renderMode === 'points') {
            const mat = new THREE.PointsMaterial({
              size: 0.1, vertexColors: hasColors,
              color: hasColors ? undefined : 0x10B981,
              transparent: true, opacity: 0.9,
            });
            obj = new THREE.Points(geo, mat);
          } else {
            obj = new THREE.Mesh(geo,
              new THREE.MeshStandardMaterial({ color: 0x059669, wireframe: false }));
          }
          obj.name = `ply_${layer.id}`;
          scene.add(obj);
          meshResults.push({ name: layer.name, object: obj, visible: true, pointSize: 0.1 });
        } catch (e) {
          console.warn(`Could not load PLY layer ${layer.name}:`, e);
        }
        loaded++;
        setProgress(Math.round((loaded / readyLayers.length) * 100));
      }

      setPointCount(totalPoints);
      setLoadedMeshes(meshResults);
      setLoading(false);

      // Fit camera to scene
      if (cameraRef.current && controlsRef.current) {
        const box = new THREE.Box3();
        scene.children.filter(c => c.name.startsWith('ply_')).forEach(c => box.expandByObject(c));
        if (!box.isEmpty()) {
          const center = box.getCenter(new THREE.Vector3());
          const size   = box.getSize(new THREE.Vector3()).length();
          cameraRef.current.position.set(center.x, center.y + size * 0.5, center.z + size);
          controlsRef.current.target.copy(center);
          controlsRef.current.update();
        }
      }
    };

    loadAll();
  }, [readyLayers.map(l => l.id).join(','), renderMode]);

  // ── Toggle visibility ────────────────────────────────────────────────
  const toggleVisibility = (idx: number) => {
    setLoadedMeshes(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], visible: !updated[idx].visible };
      updated[idx].object.visible = updated[idx].visible;
      return updated;
    });
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 'calc(100vh - 260px)', minHeight: 480 }}>
      <Box ref={mountRef} sx={{ width: '100%', height: '100%' }} />

      {/* Loading overlay */}
      {loading && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                   justifyContent: 'center', bgcolor: 'rgba(10,26,18,0.85)', zIndex: 20 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress sx={{ color: '#10B981' }} size={56} />
            <Typography sx={{ color: '#fff', fontFamily: 'Outfit' }}>
              Loading Point Cloud… {progress}%
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Layer panel */}
      <Paper elevation={6} sx={{
        position: 'absolute', top: 12, right: 12, zIndex: 10, minWidth: 220,
        p: 2, borderRadius: 3,
        bgcolor: 'rgba(10,26,18,0.92)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(16,185,129,0.2)',
      }}>
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LayersIcon sx={{ color: '#10B981', fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Point Cloud Layers
            </Typography>
          </Box>

          <ToggleButtonGroup value={renderMode} exclusive size="small"
            onChange={(_, v) => v && setRenderMode(v)}
            sx={{ '& .MuiToggleButton-root': { color: '#64748B', borderColor: '#334155' },
                  '& .Mui-selected': { color: '#10B981 !important', bgcolor: 'rgba(16,185,129,0.1) !important' } }}>
            <ToggleButton value="points"><ScatterPlotIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="mesh"><ViewInArIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>

          <Divider sx={{ borderColor: 'rgba(16,185,129,0.15)' }} />

          {loadedMeshes.length === 0 && !loading && (
            <Typography variant="caption" sx={{ color: '#475569' }}>
              {readyLayers.length === 0 ? 'No PLY layers attached to this project.' : 'Loading…'}
            </Typography>
          )}

          {loadedMeshes.map((m, idx) => (
            <FormControlLabel key={idx}
              control={<Switch size="small" checked={m.visible} color="success"
                onChange={() => toggleVisibility(idx)} />}
              label={<Typography variant="caption" sx={{ color: '#CBD5E1' }}>{m.name}</Typography>}
              sx={{ m: 0 }} />
          ))}

          {pointCount > 0 && (
            <>
              <Divider sx={{ borderColor: 'rgba(16,185,129,0.15)' }} />
              <Typography variant="caption" sx={{ color: '#475569', fontFamily: 'monospace' }}>
                {pointCount.toLocaleString()} vertices
              </Typography>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default ThreeDViewer;
