import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ImageOverlay, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Box, Button, Typography, Slider, Paper, ToggleButtonGroup, ToggleButton, Divider } from '@mui/material';
import axios from 'axios';
import { API_URL } from '../context/AuthContext';

import SquareFootIcon from '@mui/icons-material/SquareFoot';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';

// Custom icons to fix Leaflet missing default marker bundle issues in webpack/vite
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface MapViewProps {
  projectId: number;
  latitude: number;
  longitude: number;
  boundaryGeoJson?: string;
  hasOrthophoto?: boolean;
  orthophotoPath?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  projectId,
  latitude,
  longitude,
  boundaryGeoJson,
  hasOrthophoto = true,
  orthophotoPath,
}) => {
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('satellite');
  const [opacity, setOpacity] = useState<number>(0.85);
  const [tool, setTool] = useState<'pan' | 'distance' | 'area'>('pan');
  const [points, setPoints] = useState<L.LatLng[]>([]);
  const [measureValue, setMeasureValue] = useState<string>('');
  const [savedMeasurements, setSavedMeasurements] = useState<any[]>([]);

  const center: [number, number] = [latitude, longitude];

  // Define bounds for the orthophoto image overlay (+/- 0.003 degrees (~300m size))
  const offset = 0.003;
  const imageBounds: L.LatLngBoundsExpression = [
    [latitude - offset, longitude - offset],
    [latitude + offset, longitude + offset],
  ];

  const orthophotoUrl = orthophotoPath
    ? `${API_URL}/${orthophotoPath}`
    : `${API_URL}/static/processed/project_1/orthophoto.png`;

  // Fetch saved measurements from API
  const fetchMeasurements = async () => {
    try {
      const res = await axios.get(`/api/projects/${projectId}/measurements`);
      setSavedMeasurements(res.data);
    } catch (err) {
      console.error('Failed to fetch measurements:', err);
    }
  };

  useEffect(() => {
    fetchMeasurements();
  }, [projectId]);

  // Leaflet map click listener component
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (tool === 'pan') return;

        const newPoints = [...points, e.latlng];
        setPoints(newPoints);

        if (tool === 'distance') {
          // Calculate cumulative distance
          let totalDist = 0;
          for (let i = 0; i < newPoints.length - 1; i++) {
            totalDist += newPoints[i].distanceTo(newPoints[i + 1]);
          }
          setMeasureValue(`${totalDist.toFixed(2)} meters`);
        } else if (tool === 'area') {
          if (newPoints.length >= 3) {
            // Shoelace formula or simple polygon area approximation
            const lPoints = newPoints.map(p => [p.lat, p.lng]);
            const area = calculatePolygonArea(lPoints);
            setMeasureValue(`${area.toFixed(2)} sq meters`);
          } else {
            setMeasureValue('Add at least 3 points');
          }
        }
      },
    });
    return null;
  };

  const calculatePolygonArea = (coords: number[][]): number => {
    // Basic Shoelace Formula mapped to meters (1 deg lat ~ 111,000m, 1 deg lng ~ 111,000m * cos(lat))
    const latMid = latitude * (Math.PI / 180);
    const mPerDegLat = 111132.954 - 559.822 * Math.cos(2 * latMid) + 1.175 * Math.cos(4 * latMid);
    const mPerDegLng = 111412.84 * Math.cos(latMid) - 93.5 * Math.cos(3 * latMid);

    let area = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const xi = coords[i][1] * mPerDegLng;
      const yi = coords[i][0] * mPerDegLat;
      const xj = coords[j][1] * mPerDegLng;
      const yj = coords[j][0] * mPerDegLat;
      area += xi * yj - xj * yi;
    }
    return Math.abs(area / 2);
  };

  const handleToolChange = (_: React.MouseEvent<HTMLElement>, newTool: 'pan' | 'distance' | 'area') => {
    if (newTool !== null) {
      setTool(newTool);
      setPoints([]);
      setMeasureValue('');
    }
  };

  const handleClear = () => {
    setPoints([]);
    setMeasureValue('');
  };

  const handleSaveMeasurement = async () => {
    if (points.length === 0 || !measureValue) return;

    try {
      const geojson = {
        type: tool === 'distance' ? 'LineString' : 'Polygon',
        coordinates: points.map(p => [p.lng, p.lat])
      };

      const val = parseFloat(measureValue.split(' ')[0]);

      await axios.post(`/api/projects/${projectId}/measurements`, {
        name: `${tool.toUpperCase()} - ${new Date().toLocaleTimeString()}`,
        measurement_type: tool,
        geom: JSON.stringify(geojson),
        value: val,
        notes: `User measurement: ${measureValue}`
      });

      handleClear();
      fetchMeasurements();
    } catch (err) {
      console.error('Failed to save measurement:', err);
    }
  };

  // Convert GeoJSON strings back to coordinate lists to render saved points
  const renderSavedMeasurements = () => {
    return savedMeasurements.map((m) => {
      try {
        const geom = JSON.parse(m.geom);
        const coords = geom.coordinates.map((c: number[]) => [c[1], c[0]]); // Leaflet uses [lat, lng]

        if (m.measurement_type === 'distance') {
          return (
            <Polyline key={m.id} positions={coords} color="cyan" weight={3} dashArray="5, 10">
              <Popup>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{m.name}</Typography>
                <Typography variant="body2">{m.value} meters</Typography>
              </Popup>
            </Polyline>
          );
        } else if (m.measurement_type === 'area') {
          return (
            <Polygon key={m.id} positions={coords} color="emerald" fillColor="emerald" fillOpacity={0.2}>
              <Popup>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{m.name}</Typography>
                <Typography variant="body2">{m.value} sq meters</Typography>
              </Popup>
            </Polygon>
          );
        }
      } catch (e) {
        return null;
      }
      return null;
    });
  };

  // Safe boundary parsing
  let boundaryCoords: [number, number][] = [];
  if (boundaryGeoJson) {
    try {
      const boundaryObj = JSON.parse(boundaryGeoJson);
      boundaryCoords = boundaryObj.coordinates[0].map((c: number[]) => [c[1], c[0]]);
    } catch (e) {
      // Create a default box if boundary parse fails
      boundaryCoords = [
        [latitude - offset, longitude - offset],
        [latitude - offset, longitude + offset],
        [latitude + offset, longitude + offset],
        [latitude + offset, longitude - offset],
      ];
    }
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 'calc(100vh - 280px)', minHeight: 480 }}>
      {/* Map Element */}
      <MapContainer
        center={center}
        zoom={17}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapEvents />

        {mapType === 'streets' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        {/* Project Boundary Outline */}
        {boundaryCoords.length > 0 && (
          <Polygon
            positions={boundaryCoords}
            color="#ef4444"
            fillColor="#ef4444"
            fillOpacity={0.05}
            weight={2.5}
          />
        )}

        {/* Orthophoto Image Overlay */}
        {hasOrthophoto && (
          <ImageOverlay
            url={orthophotoUrl}
            bounds={imageBounds}
            opacity={opacity}
          />
        )}

        {/* Center coordinates marker */}
        <Marker position={center} icon={markerIcon}>
          <Popup>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Project Center</Typography>
            <Typography variant="body2">Lat: {latitude.toFixed(6)}</Typography>
            <Typography variant="body2">Lng: {longitude.toFixed(6)}</Typography>
          </Popup>
        </Marker>

        {/* Active Measurement drawing */}
        {points.length > 0 && tool === 'distance' && (
          <Polyline positions={points} color="#ef4444" weight={4} />
        )}
        {points.length > 0 && tool === 'area' && (
          <Polygon positions={points} color="#10b981" fillColor="#10b981" fillOpacity={0.25} />
        )}

        {/* Saved Measurements */}
        {renderSavedMeasurements()}
      </MapContainer>

      {/* Floating Control Box */}
      <Paper
        elevation={6}
        className="glass-panel"
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 1000,
          p: 2,
          width: 280,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          borderRadius: 3,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Interactive Controls
        </Typography>

        {/* Map Type toggle */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
            LAYER SELECTOR
          </Typography>
          <ToggleButtonGroup
            value={mapType}
            exclusive
            onChange={(_, val) => val && setMapType(val)}
            size="small"
            fullWidth
          >
            <ToggleButton value="satellite">Satellite</ToggleButton>
            <ToggleButton value="streets">Streets</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider />

        {/* Opacity Control */}
        {hasOrthophoto && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                ORTHOPHOTO OPACITY
              </Typography>
              <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 700 }}>
                {Math.round(opacity * 100)}%
              </Typography>
            </Box>
            <Slider
              value={opacity}
              onChange={(_, val) => setOpacity(val as number)}
              min={0}
              max={1}
              step={0.01}
              size="small"
            />
          </Box>
        )}

        <Divider />

        {/* Measurement Tools */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
            MEASUREMENT TOOLS
          </Typography>
          <ToggleButtonGroup
            value={tool}
            exclusive
            onChange={handleToolChange}
            size="small"
            fullWidth
            sx={{ mb: 1 }}
          >
            <ToggleButton value="pan">Inspect</ToggleButton>
            <ToggleButton value="distance">
              <ZoomOutMapIcon fontSize="small" sx={{ mr: 0.5 }} /> Dist
            </ToggleButton>
            <ToggleButton value="area">
              <SquareFootIcon fontSize="small" sx={{ mr: 0.5 }} /> Area
            </ToggleButton>
          </ToggleButtonGroup>

          {tool !== 'pan' && (
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', p: 1, borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {tool === 'distance' ? 'CLICK PATH ON MAP' : 'CLICK CORNERS OF POLYGON'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main', my: 0.5 }}>
                {measureValue || '0.00'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button variant="contained" color="secondary" size="small" fullWidth onClick={handleSaveMeasurement} startIcon={<SaveIcon />}>
                  Save
                </Button>
                <Button variant="outlined" color="inherit" size="small" onClick={handleClear} startIcon={<DeleteIcon />}>
                  Clear
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
export default MapView;
