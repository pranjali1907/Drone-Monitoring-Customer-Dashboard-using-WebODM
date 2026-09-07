import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Slider, Typography, Paper, Stack, Chip,
  TextField, Divider, IconButton, Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import SyncIcon from '@mui/icons-material/Sync';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}

const SplitViewer: React.FC = () => {
  const location = useLocation();
  const params   = new URLSearchParams(location.search);

  const [videoIdBefore, setVideoIdBefore] = useState(params.get('before') || '');
  const [videoIdAfter,  setVideoIdAfter]  = useState(params.get('after')  || '');
  const [started, setStarted]             = useState(false);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [sliderVal, setSliderVal]         = useState(0);
  const [duration,  setDuration]          = useState(0);
  const [offset,    setOffset]            = useState(0);    // seconds, −5 to +5
  const [driftInfo, setDriftInfo]         = useState('');
  const [apiReady,  setApiReady]          = useState(false);

  const playerBefore = useRef<any>(null);
  const playerAfter  = useRef<any>(null);
  const driftTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const seekTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSeek     = useRef(0);

  // ── Load YouTube IFrame API ──────────────────────────────────────────
  useEffect(() => {
    if (window.YT && window.YT.Player) { setApiReady(true); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => setApiReady(true);
  }, []);

  // ── Initialise players when Start clicked ───────────────────────────
  const initPlayers = () => {
    if (!apiReady || !videoIdBefore || !videoIdAfter) return;

    const commonVars = { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, enablejsapi: 1 };

    playerBefore.current = new window.YT.Player('yt-before', {
      videoId: videoIdBefore,
      playerVars: commonVars,
      events: {
        onReady: () => {
          const d = playerBefore.current.getDuration();
          if (d > 0) setDuration(d);
        },
        onStateChange: (e: any) => {
          if (e.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
          if (e.data === window.YT.PlayerState.PAUSED)  setIsPlaying(false);
        },
      },
    });

    playerAfter.current = new window.YT.Player('yt-after', { videoId: videoIdAfter, playerVars: commonVars });
    setStarted(true);
  };

  // ── Cleanup on unmount ───────────────────────────────────────────────
  useEffect(() => () => {
    if (driftTimer.current) clearInterval(driftTimer.current);
    if (seekTimer.current)  clearInterval(seekTimer.current);
  }, []);

  // ── Drift-lock engine (200 ms) ───────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    driftTimer.current = setInterval(() => {
      if (!playerBefore.current?.getCurrentTime || !playerAfter.current?.getCurrentTime) return;
      try {
        const tBefore = playerBefore.current.getCurrentTime();
        const tAfter  = playerAfter.current.getCurrentTime();
        const expected = tBefore + offset;
        const drift    = Math.abs(expected - tAfter);
        setDriftInfo(`Drift: ${drift.toFixed(3)}s`);
        if (drift > 0.12 && isPlaying) {
          playerAfter.current.seekTo(expected, true);
        }
      } catch { /* players not ready */ }
    }, 200);
    return () => { if (driftTimer.current) clearInterval(driftTimer.current); };
  }, [started, isPlaying, offset]);

  // ── Scrubber update (500 ms) ─────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    seekTimer.current = setInterval(() => {
      try {
        const t = playerBefore.current?.getCurrentTime?.() ?? 0;
        const d = playerBefore.current?.getDuration?.()    ?? 0;
        if (d > 0) { setDuration(d); setSliderVal(t); }
      } catch { /* ignore */ }
    }, 500);
    return () => { if (seekTimer.current) clearInterval(seekTimer.current); };
  }, [started]);

  // ── Controls ─────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (!started) return;
    if (isPlaying) {
      playerBefore.current?.pauseVideo();
      playerAfter.current?.pauseVideo();
    } else {
      playerBefore.current?.playVideo();
      playerAfter.current?.playVideo();
    }
    setIsPlaying(p => !p);
  };

  const handleSeek = (_: Event, val: number | number[]) => {
    const t = val as number;
    setSliderVal(t);
    const now = Date.now();
    if (now - lastSeek.current < 80) return;   // throttle to 80 ms
    lastSeek.current = now;
    playerBefore.current?.seekTo(t, true);
    playerAfter.current?.seekTo(t + offset, true);
  };

  const handleFullscreen = () => containerRef.current?.requestFullscreen?.();

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Setup screen ─────────────────────────────────────────────────────
  if (!started) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 1 }}>
          Video Comparison
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Enter two YouTube video IDs to compare Before / After drone surveys side-by-side with drift-locked playback.
        </Typography>

        <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, mb: 3 }}>
          <TextField fullWidth label="Before Flight — YouTube Video ID"
            value={videoIdBefore} onChange={e => setVideoIdBefore(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="After Flight — YouTube Video ID"
            value={videoIdAfter}  onChange={e => setVideoIdAfter(e.target.value)} />
        </Paper>

        <Button fullWidth variant="contained" size="large"
          disabled={!apiReady || !videoIdBefore || !videoIdAfter}
          onClick={initPlayers}
          sx={{ py: 1.8, borderRadius: 2, fontFamily: 'Outfit', fontWeight: 700,
                background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          {apiReady ? 'Load Comparison' : 'Loading YouTube API…'}
        </Button>
      </Box>
    );
  }

  // ── Player screen ─────────────────────────────────────────────────────
  return (
    <Box ref={containerRef} sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#000' }}>
      {/* Videos */}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* BEFORE */}
        <Box sx={{ flex: '1 1 50%', position: 'relative' }}>
          <Chip label="BEFORE" size="small"
            sx={{ position: 'absolute', top: 12, left: 12, zIndex: 10,
                  bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', fontWeight: 700 }} />
          <Box id="yt-before" sx={{ width: '100%', height: '100%' }} />
          {/* Overlay to block native YouTube clicks */}
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'default' }} onClick={togglePlay} />
        </Box>

        <Box sx={{ width: 2, bgcolor: '#fff', opacity: 0.3, flexShrink: 0 }} />

        {/* AFTER */}
        <Box sx={{ flex: '1 1 50%', position: 'relative' }}>
          <Chip label="AFTER" size="small"
            sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10,
                  bgcolor: 'rgba(0,0,0,0.7)', color: '#10B981', fontWeight: 700 }} />
          <Box id="yt-after" sx={{ width: '100%', height: '100%' }} />
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'default' }} onClick={togglePlay} />
        </Box>
      </Box>

      {/* Controls bar */}
      <Paper elevation={0} square
        sx={{ bgcolor: '#0F172A', px: 3, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>

        {/* Scrubber */}
        <Slider value={sliderVal} min={0} max={duration || 100} step={0.5}
          onChange={handleSeek}
          sx={{ color: '#10B981', p: '6px 0',
                '& .MuiSlider-thumb': { width: 14, height: 14 } }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Play / Pause */}
          <IconButton onClick={togglePlay} sx={{ bgcolor: '#10B981', color: '#fff',
              '&:hover': { bgcolor: '#059669' }, width: 44, height: 44 }}>
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          {/* Time */}
          <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace', minWidth: 90 }}>
            {formatTime(sliderVal)} / {formatTime(duration)}
          </Typography>

          <Divider orientation="vertical" flexItem sx={{ borderColor: '#334155' }} />

          {/* Offset */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 260 }}>
            <SyncIcon sx={{ color: '#64748B', fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: '#94A3B8', whiteSpace: 'nowrap' }}>
              Offset: {offset >= 0 ? '+' : ''}{offset.toFixed(2)}s
            </Typography>
            <Slider value={offset} min={-5} max={5} step={0.05}
              onChange={(_, v) => setOffset(v as number)}
              sx={{ color: '#6366F1', flex: 1,
                    '& .MuiSlider-thumb': { width: 12, height: 12 } }} />
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: '#334155' }} />

          {/* Drift badge */}
          <Typography variant="caption" sx={{ color: '#475569', fontFamily: 'monospace' }}>
            {driftInfo}
          </Typography>

          {/* Fullscreen */}
          <Tooltip title="Fullscreen">
            <IconButton onClick={handleFullscreen} sx={{ color: '#94A3B8', ml: 'auto' }}>
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    </Box>
  );
};

export default SplitViewer;
