import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Slider, Chip, Grid, Tooltip,
  TextField, InputAdornment, Divider, ButtonGroup, Button,
} from '@mui/material';

import StraightenRoundedIcon from '@mui/icons-material/StraightenRounded';
import TerrainRoundedIcon from '@mui/icons-material/TerrainRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import SwapVertRoundedIcon from '@mui/icons-material/SwapVertRounded';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import VerticalAlignCenterIcon from '@mui/icons-material/VerticalAlignCenter';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';

export interface PointCloudGeometry {
  vertices: Float32Array | number[];   // flat [x,y,z, x,y,z, ...]
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

interface VolumeCalculatorProps {
  geometry?: PointCloudGeometry | null;
}

/**
 * Volume calculation method (matches WebODM / Drone Photogrammetry Stockpile Method):
 * 1. Establish reference plane Z_ref (base elevation)
 * 2. Calculate cell grid area = (X_extent * Y_extent) / N_points
 * 3. Cut Volume = Σ max(0, z_i - Z_ref) * cell_area (stockpile material above base)
 * 4. Fill Volume = Σ max(0, Z_ref - z_i) * cell_area (excavation void below base)
 * 5. Net Volume = Cut - Fill
 */
function calculateVolumes(
  geo: PointCloudGeometry,
  zRef: number,
): {
  cut: number;
  fill: number;
  net: number;
  pointCount: number;
  zMin: number;
  zMax: number;
  zAvg: number;
  baseArea: number;
} {
  const verts = geo.vertices;
  const n = verts.length / 3;
  if (n === 0) return { cut: 0, fill: 0, net: 0, pointCount: 0, zMin: 0, zMax: 0, zAvg: 0, baseArea: 0 };

  const bb = geo.boundingBox;
  const xExtent = bb.max.x - bb.min.x;
  const yExtent = bb.max.y - bb.min.y;
  const baseArea = Math.max(xExtent * yExtent, 1);
  const cellArea = baseArea / Math.max(n, 1);

  let cut = 0;
  let fill = 0;
  let zSum = 0;
  let zMin = Infinity;
  let zMax = -Infinity;

  const arr = verts instanceof Float32Array ? verts : new Float32Array(verts);
  for (let i = 0; i < arr.length; i += 3) {
    const z = arr[i + 2];
    zSum += z;
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;

    const dz = z - zRef;
    if (dz > 0) cut += dz * cellArea;
    else fill -= dz * cellArea;
  }

  const zAvg = zSum / n;
  return { cut, fill, net: cut - fill, pointCount: n, zMin, zMax, zAvg, baseArea };
}

const VolumeCard: React.FC<{
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  tooltip: string;
}> = ({ label, value, color, bg, border, icon, tooltip }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5, borderRadius: '14px',
      bgcolor: bg, border: `1px solid ${border}`,
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 20px ${border}44` },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
        <Box sx={{ color, '& svg': { fontSize: 18 } }}>{icon}</Box>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </Typography>
      </Box>
      <Tooltip title={tooltip} arrow placement="top">
        <InfoOutlinedIcon sx={{ fontSize: 15, color: '#94A3B8', cursor: 'help' }} />
      </Tooltip>
    </Box>
    <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'Outfit', color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
      {value.toFixed(3)}
    </Typography>
    <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', mt: 0.4, fontWeight: 500 }}>
      m³ (Cubic Meters)
    </Typography>
  </Paper>
);

export const VolumeCalculator: React.FC<VolumeCalculatorProps> = ({ geometry }) => {
  // Demo fallback geometry if no PLY is directly loaded into memory
  const activeGeo = useMemo(() => {
    if (geometry) return geometry;
    // Generate synthetic stockpile data matching WebODM standard
    const points: number[] = [];
    const count = 10500;
    const radius = 50;
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * 2 * Math.PI;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const z = (1 - r / radius) * 2.44 - 1.22 + (Math.random() - 0.5) * 0.15;
      points.push(x, y, z);
    }
    return {
      vertices: new Float32Array(points),
      boundingBox: {
        min: { x: -radius, y: -radius, z: -1.218 },
        max: { x: radius, y: radius, z: 1.218 },
      },
    };
  }, [geometry]);

  const [zMin, zMax, zMid] = useMemo(() => {
    if (!activeGeo) return [-1, 1, 0];
    const bb = activeGeo.boundingBox;
    return [bb.min.z, bb.max.z, (bb.min.z + bb.max.z) / 2];
  }, [activeGeo]);

  const [zRef, setZRef] = useState<number>(0.000);
  const [inputVal, setInputVal] = useState<string>('0.000');

  const result = useMemo(() => {
    if (!activeGeo) return null;
    return calculateVolumes(activeGeo, zRef);
  }, [activeGeo, zRef]);

  const handleSliderChange = (_: Event, value: number | number[]) => {
    const val = value as number;
    setZRef(val);
    setInputVal(val.toFixed(3));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputVal(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= zMin && num <= zMax) {
      setZRef(num);
    }
  };

  const setPresetZ = (type: 'lowest' | 'highest' | 'avg') => {
    if (!result) return;
    let target = 0;
    if (type === 'lowest') target = result.zMin;
    else if (type === 'highest') target = result.zMax;
    else if (type === 'avg') target = result.zAvg;
    setZRef(target);
    setInputVal(target.toFixed(3));
  };

  const cutPct = result && (result.cut + result.fill) > 0
    ? (result.cut / (result.cut + result.fill)) * 100
    : 50;
  const fillPct = 100 - cutPct;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Paper
        elevation={0}
        sx={{
          p: 3, borderRadius: '16px',
          border: '1px solid #E2E8F0', bgcolor: '#FFFFFF',
        }}
      >
        {/* Title Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 42, height: 42, borderRadius: '12px',
                bgcolor: 'rgba(16,185,129,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CalculateRoundedIcon sx={{ color: '#10B981', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#0F172A', fontSize: '1.15rem' }}>
                Stockpile &amp; Earthwork Volume Calculator
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                Drone Photogrammetry Grid Integration Method (WebODM Standard)
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={<TerrainRoundedIcon sx={{ fontSize: 16 }} />}
            label={`${(result?.pointCount ?? 10500).toLocaleString()} 3D points`}
            size="small"
            sx={{ bgcolor: 'rgba(16,185,129,0.08)', color: '#10B981', fontWeight: 700, borderRadius: '8px' }}
          />
        </Box>

        <Divider sx={{ my: 2.5, borderColor: '#E2E8F0' }} />

        {/* Reference Plane Control & Presets */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StraightenRoundedIcon sx={{ fontSize: 16, color: '#6366F1' }} />
              <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>
                Base Reference Datum Elevation (Z ref)
              </Typography>
            </Box>

            {/* Base Level Quick Presets */}
            <ButtonGroup size="small" variant="outlined" sx={{ borderRadius: '10px' }}>
              <Button startIcon={<VerticalAlignBottomIcon />} onClick={() => setPresetZ('lowest')} sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                Lowest Base ({result?.zMin.toFixed(2)}m)
              </Button>
              <Button startIcon={<VerticalAlignCenterIcon />} onClick={() => setPresetZ('avg')} sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                Mean Ground ({result?.zAvg.toFixed(2)}m)
              </Button>
              <Button startIcon={<VerticalAlignTopIcon />} onClick={() => setPresetZ('highest')} sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                Peak ({result?.zMax.toFixed(2)}m)
              </Button>
            </ButtonGroup>

            <TextField
              value={inputVal}
              onChange={handleInputChange}
              size="small"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>m</Typography></InputAdornment>,
              }}
              sx={{
                width: 120,
                '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700 },
              }}
            />
          </Box>

          <Slider
            value={zRef}
            min={zMin}
            max={zMax}
            step={(zMax - zMin) / 1000 || 0.001}
            onChange={handleSliderChange}
            sx={{
              color: '#6366F1',
              '& .MuiSlider-rail': { bgcolor: '#E2E8F0', height: 6 },
              '& .MuiSlider-track': { height: 6 },
              '& .MuiSlider-thumb': { width: 18, height: 18 },
              '& .MuiSlider-valueLabel': { bgcolor: '#6366F1', borderRadius: '8px', fontFamily: 'Outfit', fontWeight: 700 },
            }}
            valueLabelDisplay="auto"
            valueLabelFormat={v => `${v.toFixed(2)}m`}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>Min: {zMin.toFixed(3)}m</Typography>
            <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>Max: {zMax.toFixed(3)}m</Typography>
          </Box>
        </Box>

        {/* Volume Result Cards */}
        {result && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <VolumeCard
                  label="Cut Volume (Stockpile)"
                  value={result.cut}
                  color="#EF4444"
                  bg="rgba(239,68,68,0.04)"
                  border="rgba(239,68,68,0.2)"
                  icon={<ArrowUpwardRoundedIcon />}
                  tooltip="Volume of material above reference plane (stockpile to be removed)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <VolumeCard
                  label="Fill Volume (Void)"
                  value={result.fill}
                  color="#22C55E"
                  bg="rgba(34,197,94,0.04)"
                  border="rgba(34,197,94,0.2)"
                  icon={<ArrowDownwardRoundedIcon />}
                  tooltip="Volume of void space below reference plane (backfill required)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <VolumeCard
                  label="Net Earthwork Balance"
                  value={result.net}
                  color={result.net >= 0 ? '#EF4444' : '#22C55E'}
                  bg={result.net >= 0 ? 'rgba(239,68,68,0.04)' : 'rgba(34,197,94,0.04)'}
                  border={result.net >= 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}
                  icon={<SwapVertRoundedIcon />}
                  tooltip="Cut minus Fill volume. Positive = net material surplus, Negative = net fill requirement"
                />
              </Grid>
            </Grid>

            {/* Cut/Fill Bar Chart */}
            <Box sx={{ mb: 2.5 }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', mb: 1 }}>
                Cut vs Fill Material Balance Ratio
              </Typography>
              <Box sx={{ borderRadius: '8px', overflow: 'hidden', height: 18, display: 'flex', bgcolor: '#F1F5F9' }}>
                <Box sx={{ width: `${cutPct}%`, bgcolor: '#EF4444', transition: 'width 0.4s ease' }} />
                <Box sx={{ width: `${fillPct}%`, bgcolor: '#22C55E', transition: 'width 0.4s ease' }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#EF4444' }} />
                  <Typography sx={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Cut (Stockpile) {cutPct.toFixed(1)}%</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#22C55E' }} />
                  <Typography sx={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Fill (Excavation) {fillPct.toFixed(1)}%</Typography>
                </Box>
              </Box>
            </Box>

            {/* Mathematical Formula Explanation */}
            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
                Calculation Formula &amp; Survey Metrics:
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#64748B', lineHeight: 1.6 }}>
                • <strong>Total Footprint Area:</strong> {result.baseArea.toFixed(2)} m²<br />
                • <strong>Base Plane Elevation (Z ref):</strong> {zRef.toFixed(3)} m<br />
                • <strong>Integration Formula:</strong> Volume = Σ (z_i - Z_ref) × (Base Area / N)<br />
                • Click <strong>Lowest Base ({result.zMin.toFixed(2)}m)</strong> to set the ground datum at the bottom of your stockpile for full volume measurement.
              </Typography>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default VolumeCalculator;
