import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box, Typography, Card, Chip, Stack, ToggleButtonGroup, ToggleButton,
  FormControl, InputLabel, Select, MenuItem, Slider, IconButton, Tooltip,
} from '@mui/material';
import { API_URL } from '../context/AuthContext';

import CompareRoundedIcon from '@mui/icons-material/CompareRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';

interface DroneImage { id: number; filename: string; filepath: string; }
interface DroneVideo { id: number; filename: string; filepath: string; }

interface ComparisonSliderProps {
  projectId: number;
  images?: DroneImage[];
  videos?: DroneVideo[];
}

/** Fallback aerial images when no uploads exist */
const FALLBACK_BEFORE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Aerial_view_of_Morro_Bay%2C_California_-_May_2013.jpg/1280px-Aerial_view_of_Morro_Bay%2C_California_-_May_2013.jpg';
const FALLBACK_AFTER  = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Aerial_photograph_of_a_solar_farm.jpg/1280px-Aerial_photograph_of_a_solar_farm.jpg';

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ projectId, images = [], videos = [] }) => {
  const [mode, setMode] = useState<'image' | 'video'>('image');

  // ── IMAGE mode state ───────────────────────────────────────────────────
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [beforeImageId, setBeforeImageId] = useState<string>('__fallback_before__');
  const [afterImageId, setAfterImageId]   = useState<string>('__fallback_after__');
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded]   = useState(false);
  const [beforeError, setBeforeError]   = useState(false);
  const [afterError, setAfterError]     = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resolveImgUrl = (id: string): string => {
    if (id === '__fallback_before__') return FALLBACK_BEFORE;
    if (id === '__fallback_after__')  return FALLBACK_AFTER;
    const img = images.find(i => String(i.id) === id);
    return img ? `${API_URL}/${img.filepath}` : FALLBACK_BEFORE;
  };

  const beforeSrc = beforeError ? FALLBACK_BEFORE : resolveImgUrl(beforeImageId);
  const afterSrc  = afterError  ? FALLBACK_AFTER  : resolveImgUrl(afterImageId);
  const beforeLabel = images.find(i => String(i.id) === beforeImageId)?.filename ?? 'Pre-Construction Survey';
  const afterLabel  = images.find(i => String(i.id) === afterImageId)?.filename  ?? 'Post-Construction';

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
    setSliderPos(pos);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => { if (isDragging) updateSlider(e.clientX); }, [isDragging, updateSlider]);
  const onTouchMove = useCallback((e: TouchEvent) => { if (isDragging) updateSlider(e.touches[0].clientX); }, [isDragging, updateSlider]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', () => setIsDragging(false));
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', () => setIsDragging(false));
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', () => setIsDragging(false));
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', () => setIsDragging(false));
    };
  }, [isDragging, onMouseMove, onTouchMove]);

  // ── VIDEO mode state ───────────────────────────────────────────────────
  const [beforeVideoId, setBeforeVideoId] = useState<string>('');
  const [afterVideoId, setAfterVideoId]   = useState<string>('');
  const [playing, setPlaying]             = useState(false);
  const [syncTime, setSyncTime]           = useState(0);   // seconds
  const [maxDuration, setMaxDuration]     = useState(0);
  const beforeVideoRef = useRef<HTMLVideoElement>(null);
  const afterVideoRef  = useRef<HTMLVideoElement>(null);
  const seekingRef     = useRef(false);

  const resolveVideoUrl = (id: string): string => {
    const v = videos.find(v => String(v.id) === id);
    return v ? `${API_URL}/${v.filepath}` : '';
  };

  const handlePlayPause = () => {
    const bv = beforeVideoRef.current;
    const av = afterVideoRef.current;
    if (!bv && !av) return;
    if (playing) {
      bv?.pause(); av?.pause();
    } else {
      bv?.play().catch(() => {}); av?.play().catch(() => {});
    }
    setPlaying(p => !p);
  };

  const handleSeekChange = (_: Event, value: number | number[]) => {
    const t = value as number;
    setSyncTime(t);
    seekingRef.current = true;
    if (beforeVideoRef.current) beforeVideoRef.current.currentTime = t;
    if (afterVideoRef.current)  afterVideoRef.current.currentTime  = t;
    seekingRef.current = false;
  };

  /** Sync the slider position as the lead video plays */
  const handleTimeUpdate = () => {
    if (seekingRef.current) return;
    const bv = beforeVideoRef.current;
    const av = afterVideoRef.current;
    const lead = bv || av;
    if (!lead) return;
    setSyncTime(lead.currentTime);
  };

  const handleVideoLoaded = (side: 'before' | 'after') => {
    const el = side === 'before' ? beforeVideoRef.current : afterVideoRef.current;
    if (el) setMaxDuration(d => Math.max(d, el.duration || 0));
  };

  const syncBothToTime = (t: number) => {
    if (beforeVideoRef.current) beforeVideoRef.current.currentTime = t;
    if (afterVideoRef.current)  afterVideoRef.current.currentTime  = t;
  };

  const imagesReady = (beforeLoaded || beforeError) && (afterLoaded || afterError);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: 0 }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <CompareRoundedIcon sx={{ color: '#6366F1', fontSize: 22 }} />
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A' }}>
            Before / After Comparison
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Compare survey phases using uploaded images or synchronized dual-video playback.
        </Typography>
      </Box>

      {/* ── Mode Toggle ─────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && setMode(v)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              borderRadius: '10px', px: 2.5, py: 0.8, fontFamily: 'Outfit', fontWeight: 600,
              borderColor: '#E2E8F0', color: '#64748B', textTransform: 'none', gap: 0.8,
              '&.Mui-selected': { bgcolor: '#F0FDF4', color: '#059669', borderColor: '#A7F3D0', fontWeight: 700 },
            },
          }}
        >
          <ToggleButton value="image">
            <ImageRoundedIcon fontSize="small" /> Image Comparison
          </ToggleButton>
          <ToggleButton value="video">
            <VideocamRoundedIcon fontSize="small" /> Video Comparison
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ════════════════════════════════════════════════════════════════════
          IMAGE MODE
      ════════════════════════════════════════════════════════════════════ */}
      {mode === 'image' && (
        <>
          {/* ── Gallery Dropdowns ─────────────────────────────────────── */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel sx={{ fontFamily: 'Outfit' }}>Before Image</InputLabel>
              <Select
                value={beforeImageId}
                label="Before Image"
                onChange={e => { setBeforeImageId(e.target.value); setBeforeLoaded(false); setBeforeError(false); }}
                sx={{ borderRadius: '10px', fontFamily: 'Outfit' }}
              >
                <MenuItem value="__fallback_before__">
                  <em>Default — Pre-Construction</em>
                </MenuItem>
                {images.map(img => (
                  <MenuItem key={img.id} value={String(img.id)}>
                    {img.filename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel sx={{ fontFamily: 'Outfit' }}>After Image</InputLabel>
              <Select
                value={afterImageId}
                label="After Image"
                onChange={e => { setAfterImageId(e.target.value); setAfterLoaded(false); setAfterError(false); }}
                sx={{ borderRadius: '10px', fontFamily: 'Outfit' }}
              >
                <MenuItem value="__fallback_after__">
                  <em>Default — Post-Construction</em>
                </MenuItem>
                {images.map(img => (
                  <MenuItem key={img.id} value={String(img.id)}>
                    {img.filename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Chip
              label={`Slider: ${Math.round(sliderPos)}%`}
              size="small"
              sx={{ bgcolor: 'rgba(99,102,241,0.08)', color: '#6366F1', fontWeight: 700, fontSize: '0.75rem', alignSelf: 'center' }}
            />
          </Stack>

          {/* ── Main Slider Container ─────────────────────────────────── */}
          <Card sx={{ overflow: 'hidden', borderRadius: '18px', boxShadow: '0 4px 24px rgba(15,23,42,0.10)', border: '1px solid #E2E8F0' }}>
            <Box
              ref={containerRef}
              sx={{
                position: 'relative', width: '100%',
                height: { xs: 320, sm: 480 },
                overflow: 'hidden',
                cursor: isDragging ? 'ew-resize' : 'col-resize',
                bgcolor: '#F1F5F9', userSelect: 'none',
              }}
              onMouseDown={e => { setIsDragging(true); updateSlider(e.clientX); }}
              onTouchStart={e => { setIsDragging(true); updateSlider(e.touches[0].clientX); }}
            >
              {/* Loading skeleton */}
              {!imagesReady && (
                <Box sx={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFC' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <CompareRoundedIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
                    <Typography sx={{ fontSize: '0.85rem', color: '#94A3B8' }}>Loading comparison imagery…</Typography>
                  </Box>
                </Box>
              )}

              {/* BEFORE image (right/base layer) */}
              <Box
                component="img"
                src={beforeSrc}
                alt="Before survey"
                draggable={false}
                onLoad={() => setBeforeLoaded(true)}
                onError={() => { setBeforeError(true); setBeforeLoaded(true); }}
                sx={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover', objectPosition: 'center',
                  pointerEvents: 'none',
                  opacity: imagesReady ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                }}
              />

              {/* AFTER image (left/overlay layer — clipped by slider) */}
              <Box sx={{ position: 'absolute', top: 0, left: 0, width: `${sliderPos}%`, height: '100%', overflow: 'hidden' }}>
                <Box
                  component="img"
                  src={afterSrc}
                  alt="After survey"
                  draggable={false}
                  onLoad={() => setAfterLoaded(true)}
                  onError={() => { setAfterError(true); setAfterLoaded(true); }}
                  sx={{
                    position: 'absolute', top: 0, left: 0,
                    width: sliderPos > 0 ? `${10000 / sliderPos}%` : '100%',
                    maxWidth: 'none', height: '100%',
                    objectFit: 'cover', objectPosition: 'left center',
                    pointerEvents: 'none',
                    opacity: imagesReady ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                  }}
                />

                {/* After label */}
                <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 8, bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(20,184,166,0.3)', px: 1.5, py: 0.6, borderRadius: '8px', display: sliderPos > 18 ? 'block' : 'none' }}>
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.08em' }}>After</Typography>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{afterLabel}</Typography>
                </Box>
              </Box>

              {/* Divider Line */}
              <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: `${sliderPos}%`, width: 3, background: 'linear-gradient(180deg, #6366F1, #4F46E5)', zIndex: 20, transform: 'translateX(-50%)', boxShadow: '0 0 12px rgba(99,102,241,0.5)', pointerEvents: 'none' }} />

              {/* Drag Handle */}
              <Box sx={{ position: 'absolute', top: '50%', left: `${sliderPos}%`, transform: 'translate(-50%, -50%)', zIndex: 25, width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', border: '3px solid #ffffff', boxShadow: `0 4px 16px rgba(99,102,241,0.45), 0 0 0 ${isDragging ? '6px' : '0px'} rgba(99,102,241,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem', transition: 'box-shadow 0.15s ease', pointerEvents: 'none' }}>
                ↔
              </Box>

              {/* Before label */}
              <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 8, bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(244,63,94,0.25)', px: 1.5, py: 0.6, borderRadius: '8px', display: sliderPos < 82 ? 'block' : 'none' }}>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#E11D48', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Before</Typography>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{beforeLabel}</Typography>
              </Box>

              {!isDragging && imagesReady && (
                <Box sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10, bgcolor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)', px: 2, py: 0.8, borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 1, pointerEvents: 'none' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>← Drag to compare →</Typography>
                </Box>
              )}
            </Box>

            {/* Bottom Info Strip */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0', flexWrap: 'wrap', gap: 1 }}>
              <Stack direction="row" spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#F43F5E' }} />
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Before — {beforeLabel}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#14B8A6' }} />
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>After — {afterLabel}</Typography>
                </Box>
              </Stack>
              <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>Project #{projectId} · Image Comparison</Typography>
            </Box>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIDEO MODE — Synchronized dual-video playback
      ════════════════════════════════════════════════════════════════════ */}
      {mode === 'video' && (
        <>
          {/* ── Video Selectors ───────────────────────────────────────── */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel sx={{ fontFamily: 'Outfit' }}>Before Video</InputLabel>
              <Select
                value={beforeVideoId}
                label="Before Video"
                onChange={e => { setBeforeVideoId(e.target.value); setPlaying(false); setSyncTime(0); setMaxDuration(0); }}
                sx={{ borderRadius: '10px', fontFamily: 'Outfit' }}
              >
                <MenuItem value=""><em>— Select a video —</em></MenuItem>
                {videos.map(v => <MenuItem key={v.id} value={String(v.id)}>{v.filename}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel sx={{ fontFamily: 'Outfit' }}>After Video</InputLabel>
              <Select
                value={afterVideoId}
                label="After Video"
                onChange={e => { setAfterVideoId(e.target.value); setPlaying(false); setSyncTime(0); setMaxDuration(0); }}
                sx={{ borderRadius: '10px', fontFamily: 'Outfit' }}
              >
                <MenuItem value=""><em>— Select a video —</em></MenuItem>
                {videos.map(v => <MenuItem key={v.id} value={String(v.id)}>{v.filename}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          {videos.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#F8FAFC', borderRadius: '16px', border: '1px dashed #D1FAE5' }}>
              <VideocamRoundedIcon sx={{ fontSize: 48, color: '#A7F3D0', mb: 1.5 }} />
              <Typography sx={{ fontWeight: 700, color: '#475569', mb: 0.5 }}>No videos uploaded yet</Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>Upload drone survey videos via the Admin Pipeline tab first.</Typography>
            </Box>
          ) : (
            <Card sx={{ overflow: 'hidden', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
              {/* ── Dual Video Players ──────────────────────────────── */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, position: 'relative' }}>
                {/* Before Video */}
                <Box sx={{ position: 'relative', bgcolor: '#0F172A' }}>
                  <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 5, bgcolor: 'rgba(244,63,94,0.85)', backdropFilter: 'blur(6px)', px: 1.5, py: 0.5, borderRadius: '8px' }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Before</Typography>
                  </Box>
                  {beforeVideoId ? (
                    <video
                      ref={beforeVideoRef}
                      src={resolveVideoUrl(beforeVideoId)}
                      style={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }}
                      onLoadedMetadata={() => handleVideoLoaded('before')}
                      onTimeUpdate={handleTimeUpdate}
                      muted={false}
                    />
                  ) : (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                      <VideocamRoundedIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.2)' }} />
                      <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>Select before video</Typography>
                    </Box>
                  )}
                </Box>

                {/* After Video */}
                <Box sx={{ position: 'relative', bgcolor: '#0F172A', borderLeft: '2px solid #1E293B' }}>
                  <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 5, bgcolor: 'rgba(20,184,166,0.85)', backdropFilter: 'blur(6px)', px: 1.5, py: 0.5, borderRadius: '8px' }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>After</Typography>
                  </Box>
                  {afterVideoId ? (
                    <video
                      ref={afterVideoRef}
                      src={resolveVideoUrl(afterVideoId)}
                      style={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }}
                      onLoadedMetadata={() => handleVideoLoaded('after')}
                      muted={false}
                    />
                  ) : (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                      <VideocamRoundedIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.2)' }} />
                      <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>Select after video</Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* ── Unified Controls ────────────────────────────────── */}
              <Box sx={{ px: 3, py: 2.5, bgcolor: '#0F172A', borderTop: '1px solid #1E293B' }}>
                {/* Timestamp display */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SyncRoundedIcon sx={{ fontSize: 14, color: '#10B981' }} />
                    <Typography sx={{ fontSize: '0.72rem', color: '#A7F3D0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Synchronized Seek
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'monospace', fontWeight: 600 }}>
                    {formatTime(syncTime)} / {formatTime(maxDuration)}
                  </Typography>
                </Box>

                {/* Unified seek bar */}
                <Slider
                  value={syncTime}
                  min={0}
                  max={maxDuration || 100}
                  step={0.1}
                  onChange={handleSeekChange}
                  sx={{
                    color: '#10B981',
                    '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.12)', height: 5 },
                    '& .MuiSlider-track': { height: 5 },
                    '& .MuiSlider-thumb': {
                      width: 16, height: 16,
                      '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 8px rgba(16,185,129,0.16)' },
                    },
                    mb: 2,
                  }}
                />

                {/* Play/Pause + Sync */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Tooltip title={playing ? 'Pause both videos' : 'Play both videos'}>
                    <IconButton
                      onClick={handlePlayPause}
                      sx={{
                        bgcolor: '#10B981', color: '#fff', width: 44, height: 44,
                        '&:hover': { bgcolor: '#059669' },
                        boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                      }}
                    >
                      {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Sync both videos to current position">
                    <IconButton
                      onClick={() => syncBothToTime(syncTime)}
                      sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: '#A7F3D0', width: 36, height: 36, border: '1px solid rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(16,185,129,0.12)' } }}
                    >
                      <SyncRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Typography sx={{ fontSize: '0.72rem', color: '#475569', ml: 1 }}>
                    Both videos seek together. If one lags, click Sync to realign.
                  </Typography>
                </Box>
              </Box>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default ComparisonSlider;
