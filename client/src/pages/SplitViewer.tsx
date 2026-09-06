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
  const [duration, setDuration] = useState(100); // Safe default

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
    let isReady1 = false, isReady2 = false;

    const checkBothReady = () => {
      if (isReady1 && isReady2) {
        if (beforePlayerRef.current && afterPlayerRef.current) {
          const d1 = beforePlayerRef.current.getDuration() || 0;
          const d2 = afterPlayerRef.current.getDuration() || 0;
          if (d1 > 0 && d2 > 0) {
            setDuration(Math.min(d1, d2));
          }
        }
      }
    };

    const createPlayer = (elementId: string, videoId: string, setRef: (p: any) => void, onReadyCb: () => void) => {
      const init = () => {
        const player = new window['YT'].Player(elementId, {
          videoId,
          playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, disablekb: 1, fs: 0 },
          events: { 
            onReady: () => {
              setRef(player);
              onReadyCb();
            } 
          },
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
    
    createPlayer('player-before', beforeId, (p) => { beforePlayerRef.current = p; }, () => { isReady1 = true; checkBothReady(); });
    createPlayer('player-after', afterId, (p) => { afterPlayerRef.current = p; }, () => { isReady2 = true; checkBothReady(); });
  }, [beforeId, afterId]);

  // Master Unified Play/Pause
  const togglePlay = () => {
    if (!beforePlayerRef.current || !afterPlayerRef.current) return;
    if (isPlaying) {
      beforePlayerRef.current.pauseVideo();
      afterPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      beforePlayerRef.current.playVideo();
      afterPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  // Real-Time Drift Lock Engine (200ms polling, 0.12s tolerance)
  useEffect(() => {
    if (!isPlaying) return;
    const intv = setInterval(() => {
      const t1 = beforePlayerRef.current?.getCurrentTime();
      const t2 = afterPlayerRef.current?.getCurrentTime();
      if (t1 !== undefined && t2 !== undefined) {
        if (Math.abs(t2 - (t1 + offset)) > 0.12) {
          afterPlayerRef.current.seekTo(t1 + offset, true);
        }
        setCurrentTime(t1);
      }
    }, 200);
    return () => clearInterval(intv);
  }, [isPlaying, offset]);

  // Master Scrubber logic
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val)) return;
    
    setCurrentTime(val);
    if (beforePlayerRef.current) beforePlayerRef.current.seekTo(val, true);
    if (afterPlayerRef.current) afterPlayerRef.current.seekTo(val + offset, true);
  };

  // Manual Alignment Calibration Control
  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) return;
    
    // clamp to -5.0 to 5.0 just in case
    val = Math.max(-5.0, Math.min(5.0, val));
    setOffset(val);
    
    if (isPlaying && beforePlayerRef.current && afterPlayerRef.current) {
      const base = beforePlayerRef.current.getCurrentTime();
      afterPlayerRef.current.seekTo(base + val, true);
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
    <>
      <style>
        {`
          #split-viewer:fullscreen {
            width: 100vw !important;
            height: 100vh !important;
            margin: 0;
            padding: 0;
            display: flex;
          }
          #split-viewer:fullscreen #pane-before,
          #split-viewer:fullscreen #pane-after {
            flex: 1 1 50% !important;
            height: 100% !important;
          }
        `}
      </style>
      <Box 
        id="split-viewer" 
        sx={{ display: 'flex', width: '100%', height: '80vh', position: 'relative', background: '#000', overflow: 'hidden' }}
      >
        {/* Before pane */}
        <Box id="pane-before" sx={{ flex: '1 1 50%', height: '100%', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
            <div id="player-before" style={{ width: '100%', height: '100%' }} />
          </Box>
          <Box 
            sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5 }} 
            onClick={() => {}} /* Intercepts clicks */
          />
          <Typography 
            variant="caption" 
            sx={{ position: 'absolute', top: 12, left: 12, color: '#fff', background: 'rgba(0,0,0,0.7)', px: 1.5, py: 0.5, borderRadius: 1, zIndex: 10, fontWeight: 700 }}
          >
            BEFORE
          </Typography>
        </Box>
        
        {/* After pane */}
        <Box id="pane-after" sx={{ flex: '1 1 50%', height: '100%', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
            <div id="player-after" style={{ width: '100%', height: '100%' }} />
          </Box>
          <Box 
            sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5 }} 
            onClick={() => {}} /* Intercepts clicks */
          />
          <Typography 
            variant="caption" 
            sx={{ position: 'absolute', top: 12, right: 12, color: '#fff', background: 'rgba(0,0,0,0.7)', px: 1.5, py: 0.5, borderRadius: 1, zIndex: 10, fontWeight: 700 }}
          >
            AFTER
          </Typography>
        </Box>

        {/* Master control overlay */}
        <Box sx={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,20,20,0.85)', backdropFilter: 'blur(10px)', borderRadius: 2, px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 3, zIndex: 50, border: '1px solid rgba(255,255,255,0.1)' }}>
          <IconButton id="btn-play-pause" onClick={togglePlay} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 250 }}>
            <Typography variant="caption" sx={{ color: '#aaa' }}>
              {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}
            </Typography>
            <input 
              type="range" 
              id="master-scrubber" 
              min="0" 
              max={duration} 
              step="0.05" 
              value={currentTime} 
              onChange={handleScrub} 
              style={{ flexGrow: 1, cursor: 'pointer' }}
            />
            <Typography variant="caption" sx={{ color: '#aaa' }}>
              {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ color: '#aaa', fontWeight: 600 }}>SYNC OFFSET</Typography>
            <input 
              type="number" 
              id="sync-offset" 
              step="0.05" 
              min="-5" 
              max="5" 
              value={offset} 
              onChange={handleOffsetChange} 
              style={{ width: 60, padding: '4px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#fff', textAlign: 'center' }}
            />
          </Box>

          <Tooltip title="Fullscreen">
            <IconButton id="btn-fullscreen" onClick={requestFullscreen} sx={{ color: '#fff' }}>
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </>
  );
};

export default SplitViewer;
