// client/src/pages/SplitViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, TextField, IconButton, Tooltip, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

/** Extract YouTube video ID from URL or raw ID */
const extractVideoId = (url: string): string | null => {
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  const match = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[&#]|$)/);
  return match ? match[1] : null;
};

const SplitViewer: React.FC = () => {
  const [beforeInput, setBeforeInput] = useState('');
  const [afterInput, setAfterInput] = useState('');
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const beforePlayerRef = useRef<any>(null);
  const afterPlayerRef = useRef<any>(null);
  const [offset, setOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window['YT']) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const first = document.getElementsByTagName('script')[0];
    first.parentNode?.insertBefore(tag, first);
    // @ts-ignore
    window['onYouTubeIframeAPIReady'] = () => {};
  }, []);

  // Initialise players when IDs are available
  useEffect(() => {
    if (!beforeId || !afterId) return;
    const createPlayer = (elementId: string, videoId: string, setRef: (p: any) => void) => {
      const init = () => {
        const player = new window['YT'].Player(elementId, {
          videoId,
          playerVars: { controls: 0, modestbranding: 1, rel: 0, disablekb: 1, fs: 0 },
          events: { onReady: () => setRef(player) },
        });
      };
      if (window['YT'] && window['YT'].Player) init();
      else {
        const intv = setInterval(() => {
          if (window['YT'] && window['YT'].Player) {
            clearInterval(intv);
            init();
          }
        }, 100);
      }
    };
    createPlayer('player-before', beforeId, (p) => { beforePlayerRef.current = p; p.pauseVideo(); });
    createPlayer('player-after', afterId, (p) => { afterPlayerRef.current = p; p.pauseVideo(); });
  }, [beforeId, afterId]);

  const togglePlay = () => {
    if (!beforePlayerRef.current || !afterPlayerRef.current) return;
    if (isPlaying) {
      beforePlayerRef.current.pauseVideo();
      afterPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      beforePlayerRef.current.playVideo();
      const base = beforePlayerRef.current.getCurrentTime();
      afterPlayerRef.current.seekTo(base + offset, true);
      afterPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  // Periodic sync
  useEffect(() => {
    if (!isPlaying) return;
    const intv = setInterval(() => {
      const t1 = beforePlayerRef.current?.getCurrentTime();
      const t2 = afterPlayerRef.current?.getCurrentTime();
      if (t1 !== undefined && t2 !== undefined && Math.abs(t2 - (t1 + offset)) > 0.08) {
        afterPlayerRef.current.seekTo(t1 + offset, true);
      }
      setCurrentTime(t1 ?? 0);
    }, 250);
    return () => clearInterval(intv);
  }, [isPlaying, offset]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (isNaN(v)) return;
    beforePlayerRef.current?.seekTo(v, true);
    afterPlayerRef.current?.seekTo(v + offset, true);
    setCurrentTime(v);
  };

  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (isNaN(v)) return;
    setOffset(v);
    if (isPlaying && beforePlayerRef.current) {
      const base = beforePlayerRef.current.getCurrentTime();
      afterPlayerRef.current?.seekTo(base + v, true);
    }
  };

  const requestFullscreen = () => {
    const el = document.getElementById('split-viewer');
    if (el?.requestFullscreen) el.requestFullscreen();
    else if ((el as any)?.webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  };

  if (!beforeId || !afterId) {
    return (
      <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>Split‑Screen Video Comparison</Typography>
        <TextField fullWidth label="Before video YouTube URL or ID" margin="normal" value={beforeInput} onChange={(e) => setBeforeInput(e.target.value)} />
        <TextField fullWidth label="After video YouTube URL or ID" margin="normal" value={afterInput} onChange={(e) => setAfterInput(e.target.value)} />
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => {
          const b = extractVideoId(beforeInput.trim());
          const a = extractVideoId(afterInput.trim());
          if (b && a) { setBeforeId(b); setAfterId(a); } else alert('Enter valid YouTube URLs or IDs');
        }}>Load Videos</Button>
      </Box>
    );
  }

  return (
    <Box id="split-viewer" sx={{ display: 'flex', width: '100%', height: '80vh', position: 'relative', background: '#000' }}>
      <Box sx={{ width: '50%', position: 'relative' }}>
        <div id="player-before" style={{ width: '100%', height: '100%' }} />
        <Typography variant="caption" sx={{ position: 'absolute', top: 8, left: 8, color: '#fff', background: 'rgba(0,0,0,0.5)', px: 1, py: 0.5 }}>BEFORE</Typography>
      </Box>
      <Box sx={{ width: '50%', position: 'relative' }}>
        <div id="player-after" style={{ width: '100%', height: '100%' }} />
        <Typography variant="caption" sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', background: 'rgba(0,0,0,0.5)', px: 1, py: 0.5 }}>AFTER</Typography>
      </Box>
      <Box sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', borderRadius: 1, px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={togglePlay}>{isPlaying ? <PauseIcon /> : <PlayArrowIcon />}</IconButton>
        <TextField label="Current (s)" type="number" size="small" value={currentTime.toFixed(2)} onChange={handleSeek} inputProps={{ step: 0.1, min: 0 }} sx={{ width: 120 }} />
        <TextField label="Offset (s)" type="number" size="small" value={offset} onChange={handleOffsetChange} inputProps={{ step: 0.05, min: -5, max: 5 }} sx={{ width: 100 }} />
        <Tooltip title="Fullscreen"><IconButton onClick={requestFullscreen}><FullscreenIcon /></IconButton></Tooltip>
      </Box>
    </Box>
  );
};

export default SplitViewer;
