import React, { useEffect, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Polygon, Polyline,
  useMapEvents, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Box, Button, Paper, Typography, ToggleButtonGroup, ToggleButton,
  Slider, Stack, Divider, Chip,
} from '@mui/material';
import axios from 'axios';
import StraightenIcon from '@mui/icons-material/Straighten';
import CropFreeIcon from '@mui/icons-material/CropFree';
import PanToolIcon from '@mui/icons-material/PanTool';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

interface Layer {
  id: number;
  layer_type: string;
  tile_url_pattern: string | null;
  status: string;
  name: string;
}

interface MapViewProps {
  projectId: number;
  latitude: number;
  longitude: number;
  boundaryWkt?: string;
}

// Fit map to bounds when boundary is available
const FitBounds = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom, { animate: false }); }, []);
  return null;
};

// Measurement click listener
const MapClickHandler = ({
  tool, onPoint,
}: { tool: string; onPoint: (latlng: L.LatLng) => void }) => {
  useMapEvents({ click(e) { if (tool !== 'pan') onPoint(e.latlng); } });
  return null;
};

export const MapView: React.FC<MapViewProps> = ({ projectId, latitude, longitude }) => {
  const [rasterLayers, setRasterLayers] = useState<Layer[]>([]);
  const [opacity, setOpacity]           = useState(0.85);
  const [tool, setTool]                 = useState<'pan' | 'distance' | 'area'>('pan');
  const [points, setPoints]             = useState<L.LatLng[]>([]);
  const [measureLabel, setMeasureLabel] = useState('');
  const [measurements, setMeasurements] = useState<any[]>([]);

  const center: [number, number] = [latitude, longitude];

  // Poll layers every 5s
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`/api/projects/${projectId}/layers`);
        setRasterLayers((res.data as Layer[]).filter(l => l.layer_type === 'RASTER_TILES'));
      } catch { /* ignore */ }
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Load saved measurements
  useEffect(() => {
    axios.get(`/api/projects/${projectId}/measurements`)
      .then(r => setMeasurements(r.data))
      .catch(() => {});
  }, [projectId]);

  const handlePoint = (latlng: L.LatLng) => {
    const updated = [...points, latlng];
    setPoints(updated);

    if (tool === 'distance' && updated.length >= 2) {
      let dist = 0;
      for (let i = 0; i < updated.length - 1; i++) dist += updated[i].distanceTo(updated[i + 1]);
      setMeasureLabel(dist >= 1000 ? `${(dist / 1000).toFixed(3)} km` : `${dist.toFixed(1)} m`);
    } else if (tool === 'area' && updated.length >= 3) {
      const area = calculateGeodesicArea(updated);
      setMeasureLabel(area >= 10000 ? `${(area / 10000).toFixed(4)} ha` : `${area.toFixed(1)} m²`);
    }
  };

  const calculateGeodesicArea = (pts: L.LatLng[]): number => {
    const R = 6371000;
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const xi = (pts[i].lng * Math.PI) / 180;
      const yi = (pts[i].lat * Math.PI) / 180;
      const xj = (pts[j].lng * Math.PI) / 180;
      const yj = (pts[j].lat * Math.PI) / 180;
      area += xi * Math.sin(yj) - xj * Math.sin(yi);
    }
    return Math.abs((area * R * R) / 2);
  };

  const handleSave = async () => {
    if (!measureLabel || points.length < 2) return;
    const isArea = tool === 'area';
    const raw = measureLabel.includes('km')
      ? parseFloat(measureLabel) * 1000
      : parseFloat(measureLabel);
    const geojson = {
      type: isArea ? 'Polygon' : 'LineString',
      coordinates: isArea
        ? [points.map(p => [p.lng, p.lat])]
        : points.map(p => [p.lng, p.lat]),
    };
    try {
      await axios.post(`/api/projects/${projectId}/measurements`, {
        name: `${tool.toUpperCase()} – ${new Date().toLocaleTimeString()}`,
        measurement_type: tool,
        value: raw,
        geom_geojson: JSON.stringify(geojson),
      });
      setPoints([]);
      setMeasureLabel('');
      const res = await axios.get(`/api/projects/${projectId}/measurements`);
      setMeasurements(res.data);
    } catch { /* ignore */ }
  };

  const readyLayers  = rasterLayers.filter(l => l.status === 'READY');
  const pendingCount = rasterLayers.filter(l => l.status !== 'READY').length;

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 'calc(100vh - 260px)', minHeight: 480 }}>
      {/* Processing indicator */}
      {pendingCount > 0 && (
        <Box sx={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <Paper elevation={4} sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderRadius: 3 }}>
            <CircularLinear size={20} />
            <Typography variant="caption">GDAL tiling in progress…</Typography>
          </Paper>
        </Box>
      )}

      <MapContainer center={center} zoom={15} style={{ width: '100%', height: '100%' }}>
        <FitBounds center={center} zoom={15} />
        <MapClickHandler tool={tool} onPoint={handlePoint} />

        {/* Satellite basemap */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri World Imagery"
        />

        {/* GDAL raster tiles */}
        {readyLayers.map((layer) => (
          <TileLayer
            key={layer.id}
            url={`${layer.tile_url_pattern}`}
            tms={false}
            opacity={opacity}
          />
        ))}

        {/* Center marker */}
        <Marker position={center} icon={markerIcon}>
          <Popup>Survey Center<br />{latitude.toFixed(5)}, {longitude.toFixed(5)}</Popup>
        </Marker>

        {/* Active measurement drawing */}
        {points.length >= 2 && tool === 'distance' && (
          <Polyline positions={points} color="#EF4444" weight={3} />
        )}
        {points.length >= 3 && tool === 'area' && (
          <Polygon positions={points} color="#10B981" fillOpacity={0.2} />
        )}

        {/* Saved measurements */}
        {measurements.map(m => {
          try {
            const geo = JSON.parse(m.geom_geojson);
            const coords = geo.type === 'Polygon'
              ? geo.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number])
              : geo.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
            return m.measurement_type === 'area'
              ? <Polygon key={m.id} positions={coords} color="#6366F1" fillOpacity={0.15} />
              : <Polyline key={m.id} positions={coords} color="#6366F1" weight={2} dashArray="6,4" />;
          } catch { return null; }
        })}
      </MapContainer>

      {/* Controls overlay */}
      <Paper elevation={6} sx={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        p: 2, borderRadius: 3, minWidth: 200,
        bgcolor: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)',
      }}>
        <Stack spacing={2}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Map Tools
          </Typography>
          <ToggleButtonGroup
            value={tool} exclusive size="small"
            onChange={(_, v) => { if (v) { setTool(v); setPoints([]); setMeasureLabel(''); } }}
          >
            <ToggleButton value="pan"><PanToolIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="distance"><StraightenIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="area"><CropFreeIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>

          {measureLabel && (
            <Chip label={measureLabel} color="success" size="small" />
          )}

          {points.length >= 2 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" startIcon={<SaveIcon />} onClick={handleSave}>Save</Button>
              <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => { setPoints([]); setMeasureLabel(''); }}>Clear</Button>
            </Box>
          )}

          <Divider />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Overlay Opacity
          </Typography>
          <Slider value={opacity} onChange={(_, v) => setOpacity(v as number)}
            min={0} max={1} step={0.05} size="small" sx={{ color: '#10B981' }} />
        </Stack>
      </Paper>
    </Box>
  );
};

// Tiny spinner helper
const CircularLinear = ({ size = 24 }: { size?: number }) => (
  <Box sx={{ width: size, height: size, borderRadius: '50%',
    border: '3px solid #E2E8F0', borderTopColor: '#10B981',
    animation: 'spin 0.8s linear infinite',
    '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
  }} />
);

export default MapView;
