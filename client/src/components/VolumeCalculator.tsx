import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Slider, Chip, Grid, Tooltip,
  TextField, InputAdornment, Button, Divider,
} from '@mui/material';

import StraightenRoundedIcon from '@mui/icons-material/StraightenRounded';
import TerrainRoundedIcon from '@mui/icons-material/TerrainRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import SwapVertRoundedIcon from '@mui/icons-material/SwapVertRounded';

export interface PointCloudGeometry {
  vertices: Float32Array | number[];   // flat [x,y,z, x,y,z, ...]
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

interface VolumeCalculatorProps {
  geometry: PointCloudGeometry | null;
}

/**
 * Volume calculation method (matches the YouTube voxel-column approach):
 * 1. Establish a reference plane at height Z_ref
 * 2. For each point above Z_ref  → contributes to CUT volume
 * 3. For each point below Z_ref  → contributes to FILL volume
 * 4. Each point represents a column with area = (width * depth) / sqrt(n_points)
 *    and height = |z - z_ref|
 *
 * This approximates the stockpile / cut-fill volumes used in drone surveying.
 */
function calculateVolumes(
  geo: PointCloudGeometry,
  zRef: number,
): { cut: number; fill: number; net: number; pointCount: number } {
  const verts = geo.vertices;
  const n = verts instanceof Float32Array ? verts.length / 3 : verts.length / 3;
  if (n === 0) return { cut: 0, fill: 0, net: 0, pointCount: 0 };

  const bb = geo.boundingBox;
  const areaTotal = (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y);
  // Area represented by each point (uniform grid approximation)
  const cellArea = areaTotal / Math.max(n, 1);

  let cut = 0;
  let fill = 0;

  const arr = verts instanceof Float32Array ? verts : new Float32Array(verts);
  for (let i = 0; i < arr.length; i += 3) {
    const z = arr[i + 2];
    const dz = z - zRef;
    if (dz > 0) cut  += dz * cellArea;  // above baseline → cut
    else         fill -= dz * cellArea;  // below baseline → fill (positive)
  }

  return { cut, fill, net: cut - fill, pointCount: n };
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ color, fontSize: 18 }}>{icon}</Box>
        <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
      </Box>
      <Tooltip title={tooltip} arrow>
        <InfoOutlinedIcon sx={{ fontSize: 15, color: '#94A3B8', cursor: 'help' }} />
      </Tooltip>
    </Box>
    <Typography sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.8rem', color, letterSpacing: '-0.02em', lineHeight: 1 }}>
      {Math.abs(value).toFixed(3)}
    </Typography>
    <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', mt: 0.3 }}>m³</Typography>
  </Paper>
);

export const VolumeCalculator: React.FC<VolumeCalculatorProps> = ({ geometry }) => {
  const bb = geometry?.boundingBox;
  const zMin = bb?.min.z ?? 0;
  const zMax = bb?.max.z ?? 10;
  const zMid = (zMin + zMax) / 2;

  const [zRef, setZRef] = useState<number>(parseFloat(zMid.toFixed(3)));
  const [inputVal, setInputVal] = useState<string>(zMid.toFixed(3));

  const result = useMemo(() => {
    if (!geometry) return null;
    return calculateVolumes(geometry, zRef);
  }, [geometry, zRef]);

  const handleSliderChange = (_: Event, val: number | number[]) => {
    const v = val as number;
    setZRef(v);
    setInputVal(v.toFixed(3));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
    const n = parseFloat(e.target.value);
    if (!isNaN(n)) setZRef(n);
  };

  const cutPct  = result ? (result.cut  / (result.cut + result.fill + 0.001)) * 100 : 50;
  const fillPct = result ? (result.fill / (result.cut + result.fill + 0.001)) * 100 : 50;

  return (
    <Box sx={{ mt: 3 }}>
      <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid #D1FAE5', bgcolor: '#FAFFFE' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalculateRoundedIcon sx={{ fontSize: 20, color: '#059669' }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>
              Volume Calculator
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
              Cut / Fill / Net volumes from point cloud reference plane
            </Typography>
          </Box>
          <Chip
            label={result ? `${result.pointCount.toLocaleString()} pts` : 'No cloud'}
            size="small"
            sx={{ ml: 'auto', bgcolor: '#F0FDF4', color: '#059669', fontWeight: 700, fontSize: '0.72rem' }}
          />
        </Box>

        {!geometry ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <TerrainRoundedIcon sx={{ fontSize: 48, color: '#A7F3D0', mb: 1.5 }} />
            <Typography sx={{ fontWeight: 600, color: '#475569' }}>No point cloud loaded</Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
              Upload and open a .ply file in the 3D viewer to calculate volumes.
            </Typography>
          </Box>
        ) : (
          <>
            <Divider sx={{ my: 2.5, borderColor: '#E2E8F0' }} />

            {/* Reference Plane Control */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StraightenRoundedIcon sx={{ fontSize: 16, color: '#6366F1' }} />
                  <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>
                    Reference Elevation Plane (Z)
                  </Typography>
                </Box>
                <TextField
                  value={inputVal}
                  onChange={handleInputChange}
                  size="small"
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>m</Typography></InputAdornment>,
                  }}
                  sx={{
                    width: 110,
                    '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700 },
                  }}
                />
              </Box>

              <Slider
                value={zRef}
                min={zMin}
                max={zMax}
                step={(zMax - zMin) / 1000}
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
                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>Min Z: {zMin.toFixed(3)}m</Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>Max Z: {zMax.toFixed(3)}m</Typography>
              </Box>
            </Box>

            {/* Volume Result Cards */}
            {result && (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={4}>
                    <VolumeCard
                      label="Cut Volume"
                      value={result.cut}
                      color="#EF4444"
                      bg="rgba(239,68,68,0.04)"
                      border="rgba(239,68,68,0.2)"
                      icon={<ArrowUpwardRoundedIcon />}
                      tooltip="Volume of material above the reference plane (material to be removed)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <VolumeCard
                      label="Fill Volume"
                      value={result.fill}
                      color="#22C55E"
                      bg="rgba(34,197,94,0.04)"
                      border="rgba(34,197,94,0.2)"
                      icon={<ArrowDownwardRoundedIcon />}
                      tooltip="Volume of void below the reference plane (material needed to fill)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <VolumeCard
                      label="Net Volume"
                      value={result.net}
                      color={result.net >= 0 ? '#EF4444' : '#22C55E'}
                      bg={result.net >= 0 ? 'rgba(239,68,68,0.04)' : 'rgba(34,197,94,0.04)'}
                      border={result.net >= 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}
                      icon={<SwapVertRoundedIcon />}
                      tooltip="Cut minus Fill. Positive = net excavation, Negative = net fill needed"
                    />
                  </Grid>
                </Grid>

                {/* Cut/Fill Bar Chart */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', mb: 1 }}>
                    Cut vs Fill Ratio
                  </Typography>
                  <Box sx={{ borderRadius: '8px', overflow: 'hidden', height: 18, display: 'flex', bgcolor: '#F1F5F9' }}>
                    <Box sx={{ width: `${cutPct}%`, bgcolor: '#EF4444', transition: 'width 0.4s ease' }} />
                    <Box sx={{ width: `${fillPct}%`, bgcolor: '#22C55E', transition: 'width 0.4s ease' }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.8 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#EF4444' }} />
                      <Typography sx={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Cut {cutPct.toFixed(1)}%</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#22C55E' }} />
                      <Typography sx={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Fill {fillPct.toFixed(1)}%</Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Method Note */}
                <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', lineHeight: 1.5 }}>
                    <strong>Method:</strong> Voxel column approximation — each point represents a terrain column
                    with area = (X-extent × Y-extent) / N points. Volume = Σ(|ΔZ| × cell area).
                    Adjust the Z reference plane to match your site's base elevation for accurate results.
                  </Typography>
                </Box>
              </>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default VolumeCalculator;
