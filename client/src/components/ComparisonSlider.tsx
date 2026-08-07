import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, Card, Button, Chip, Stack } from '@mui/material';
import { API_URL } from '../context/AuthContext';

import CompareRoundedIcon from '@mui/icons-material/CompareRounded';
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded';

interface ComparisonSliderProps {
  projectId: number;
}

/** Compute the correct before/after image URLs.
 *  - For project_1: use the real AI-generated aerial images we seeded.
 *  - Fallback: use reliable public aerial imagery from Wikimedia (no CORS issues).
 */
function getImageUrls(projectId: number) {
  if (projectId === 1) {
    return {
      before: `${API_URL}/static/processed/project_${projectId}/before.jpg`,
      after: `${API_URL}/static/processed/project_${projectId}/after.jpg`,
      beforeLabel: 'Pre-Construction Survey',
      afterLabel: 'Solar Farm Installed (Q2)',
      phase1: 'Phase 1 · Q1 2024',
      phase2: 'Phase 2 · Q2 2024',
    };
  }
  return {
    // Reliable Wikimedia Commons aerial images (no CORS, always available)
    before: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Aerial_view_of_Morro_Bay%2C_California_-_May_2013.jpg/1280px-Aerial_view_of_Morro_Bay%2C_California_-_May_2013.jpg',
    after: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Aerial_photograph_of_a_solar_farm.jpg/1280px-Aerial_photograph_of_a_solar_farm.jpg',
    beforeLabel: 'Pre-Construction Survey',
    afterLabel: 'Post-Construction (Q2)',
    phase1: 'Phase 1 · Pre-Build',
    phase2: 'Phase 2 · Completed',
  };
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ projectId }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const [beforeError, setBeforeError] = useState(false);
  const [afterError, setAfterError] = useState(false);
  const [customBefore, setCustomBefore] = useState<string | null>(null);
  const [customAfter, setCustomAfter]   = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef  = useRef<HTMLInputElement>(null);

  const urls = getImageUrls(projectId);
  const beforeSrc = customBefore ?? (beforeError ? getFallback('before') : urls.before);
  const afterSrc  = customAfter  ?? (afterError  ? getFallback('after')  : urls.after);

  function getFallback(side: 'before' | 'after') {
    // Absolute fallback: use picsum with fixed seeds (guaranteed to load)
    return side === 'before'
      ? 'https://picsum.photos/seed/aerial-before/1200/700'
      : 'https://picsum.photos/seed/aerial-after/1200/700';
  }

  // Mouse/touch drag logic
  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 2), 98);
    setSliderPos(pos);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    updateSlider(e.clientX);
  }, [isDragging, updateSlider]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    updateSlider(e.touches[0].clientX);
  }, [isDragging, updateSlider]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', () => setIsDragging(false));
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', () => setIsDragging(false));
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', () => setIsDragging(false));
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', () => setIsDragging(false));
    };
  }, [isDragging, onMouseMove, onTouchMove]);

  const handleFileUpload = (side: 'before' | 'after', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (side === 'before') setCustomBefore(dataUrl);
      else setCustomAfter(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const imagesReady = (beforeLoaded || beforeError || customBefore) &&
                      (afterLoaded  || afterError  || customAfter);

  return (
    <Box sx={{ p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <CompareRoundedIcon sx={{ color: '#6366F1', fontSize: 22 }} />
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700, color: '#0F172A' }}>
            Before / After Comparison
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Drag the center handle to compare survey phases. Upload your own orthophotos to replace the defaults.
        </Typography>
      </Box>

      {/* Upload Controls */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <input
          ref={beforeInputRef} type="file" accept="image/*" hidden
          onChange={e => e.target.files?.[0] && handleFileUpload('before', e.target.files[0])}
        />
        <input
          ref={afterInputRef} type="file" accept="image/*" hidden
          onChange={e => e.target.files?.[0] && handleFileUpload('after', e.target.files[0])}
        />
        <Button
          variant="outlined" size="small" startIcon={<FileUploadRoundedIcon />}
          onClick={() => beforeInputRef.current?.click()}
          sx={{
            borderRadius: '10px', borderColor: '#E2E8F0', color: '#475569',
            '&:hover': { borderColor: '#6366F1', color: '#6366F1', bgcolor: 'rgba(99,102,241,0.05)' },
          }}
        >
          Upload Before Image
        </Button>
        <Button
          variant="outlined" size="small" startIcon={<FileUploadRoundedIcon />}
          onClick={() => afterInputRef.current?.click()}
          sx={{
            borderRadius: '10px', borderColor: '#E2E8F0', color: '#475569',
            '&:hover': { borderColor: '#14B8A6', color: '#14B8A6', bgcolor: 'rgba(20,184,166,0.05)' },
          }}
        >
          Upload After Image
        </Button>
        <Chip
          label={`Slider: ${Math.round(sliderPos)}%`}
          size="small"
          sx={{ bgcolor: 'rgba(99,102,241,0.08)', color: '#6366F1', fontWeight: 700, fontSize: '0.75rem', alignSelf: 'center' }}
        />
      </Stack>

      {/* Main Slider Container */}
      <Card
        sx={{
          overflow: 'hidden', borderRadius: '18px',
          boxShadow: '0 4px 24px rgba(15,23,42,0.10)',
          border: '1px solid #E2E8F0',
        }}
      >
        <Box
          ref={containerRef}
          sx={{
            position: 'relative',
            width: '100%',
            height: { xs: 320, sm: 480 },
            overflow: 'hidden',
            cursor: isDragging ? 'ew-resize' : 'col-resize',
            bgcolor: '#F1F5F9',
            userSelect: 'none',
          }}
          onMouseDown={(e) => { setIsDragging(true); updateSlider(e.clientX); }}
          onTouchStart={(e) => { setIsDragging(true); updateSlider(e.touches[0].clientX); }}
        >
          {/* Loading skeleton */}
          {!imagesReady && (
            <Box sx={{
              position: 'absolute', inset: 0, zIndex: 5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: '#F8FAFC',
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <CompareRoundedIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
                <Typography sx={{ fontSize: '0.85rem', color: '#94A3B8' }}>Loading comparison imagery…</Typography>
              </Box>
            </Box>
          )}

          {/* ── BEFORE image (right/base layer) ───────────────────── */}
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

          {/* ── AFTER image (left/overlay layer — clipped by slider) ── */}
          <Box
            sx={{
              position: 'absolute', top: 0, left: 0,
              width: `${sliderPos}%`, height: '100%',
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={afterSrc}
              alt="After survey"
              draggable={false}
              onLoad={() => setAfterLoaded(true)}
              onError={() => { setAfterError(true); setAfterLoaded(true); }}
              sx={{
                position: 'absolute', top: 0, left: 0,
                width: sliderPos > 0 ? `${10000 / sliderPos}%` : '100%',  // expand img to fill clipped box
                maxWidth: 'none',
                height: '100%',
                objectFit: 'cover', objectPosition: 'left center',
                pointerEvents: 'none',
                opacity: imagesReady ? 1 : 0,
                transition: 'opacity 0.4s ease',
              }}
            />

            {/* After label */}
            <Box
              sx={{
                position: 'absolute', top: 16, left: 16, zIndex: 8,
                bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(20,184,166,0.3)',
                px: 1.5, py: 0.6, borderRadius: '8px',
                display: sliderPos > 20 ? 'block' : 'none',
              }}
            >
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {urls.phase2}
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                {customAfter ? 'Custom Upload' : urls.afterLabel}
              </Typography>
            </Box>
          </Box>

          {/* ── Divider Line ────────────────────────────────────────── */}
          <Box
            sx={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${sliderPos}%`,
              width: 3,
              background: 'linear-gradient(180deg, #6366F1, #4F46E5)',
              zIndex: 20,
              transform: 'translateX(-50%)',
              boxShadow: '0 0 12px rgba(99,102,241,0.5)',
              pointerEvents: 'none',
            }}
          />

          {/* ── Drag Handle ─────────────────────────────────────────── */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: `${sliderPos}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 25,
              width: 44, height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              border: '3px solid #ffffff',
              boxShadow: `0 4px 16px rgba(99,102,241,0.45), 0 0 0 ${isDragging ? '6px' : '0px'} rgba(99,102,241,0.2)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '1rem',
              transition: 'box-shadow 0.15s ease',
              pointerEvents: 'none',
            }}
          >
            ↔
          </Box>

          {/* Before label */}
          <Box
            sx={{
              position: 'absolute', top: 16, right: 16, zIndex: 8,
              bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(244,63,94,0.25)',
              px: 1.5, py: 0.6, borderRadius: '8px',
              display: sliderPos < 80 ? 'block' : 'none',
            }}
          >
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#E11D48', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {urls.phase1}
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
              {customBefore ? 'Custom Upload' : urls.beforeLabel}
            </Typography>
          </Box>

          {/* Hint overlay when not dragging */}
          {!isDragging && imagesReady && (
            <Box
              sx={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                zIndex: 10, bgcolor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)',
                px: 2, py: 0.8, borderRadius: '20px',
                display: 'flex', alignItems: 'center', gap: 1,
                pointerEvents: 'none',
              }}
            >
              <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                ← Drag to compare →
              </Typography>
            </Box>
          )}
        </Box>

        {/* Bottom Info Strip */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 3, py: 1.5, bgcolor: '#F8FAFC', borderTop: '1px solid #E2E8F0',
            flexWrap: 'wrap', gap: 1,
          }}
        >
          <Stack direction="row" spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#F43F5E' }} />
              <Typography sx={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                Before — {customBefore ? 'Custom upload' : urls.beforeLabel}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#14B8A6' }} />
              <Typography sx={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                After — {customAfter ? 'Custom upload' : urls.afterLabel}
              </Typography>
            </Box>
          </Stack>
          <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
            Project #{projectId} · Comparison View
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default ComparisonSlider;
