// client/src/pages/SplitViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, TextField, IconButton, Tooltip, Typography, Paper } from '@mui/material';
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
    if ((window as any).YT) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const first = document.getElementsByTagName('script')[0];
    first.parentNode?.insertBefore(tag, first);
    (window as any).onYouTubeIframeAPIReady = () => {};
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
        const player = new (window as any).YT.Player(elementId, {
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
      if ((window as any).YT && (window as any).YT.Player) init();
      else {
        const intv = setInterval(() => {
          if ((window as any).YT && (window as any).YT.Player) {
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

  const handleStartFullscreen = async () => {
    const b = extractVideoId(beforeInput.trim());
    const a = extractVideoId(afterInput.trim());
    if (!b || !a) {
      alert('Please enter valid YouTube URLs or IDs for both videos.');
      return;
    }

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request failed", e);
    }

    setBeforeId(b);
    setAfterId(a);
  };

  const handleExitFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn(e);
    }
    // Optionally go back to inputs
    setBeforeId(null);
    setAfterId(null);
  };

  if (!beforeId || !afterId) {
    return (
      <Box sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 4 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 1, fontFamily: 'Outfit' }}>
            Before & After Video Comparison
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569', mb: 4 }}>
            Enter the YouTube links for the pre-monsoon and post-monsoon videos. 
            The comparison will launch in <strong>Full Screen mode</strong> (similar to online test formats) for maximum visibility.
          </Typography>
          
          <TextField fullWidth label="Before video (YouTube URL or ID)" margin="normal" value={beforeInput} onChange={(e) => setBeforeInput(e.target.value)} sx={{ bgcolor: '#FFF' }} />
          <TextField fullWidth label="After video (YouTube URL or ID)" margin="normal" value={afterInput} onChange={(e) => setAfterInput(e.target.value)} sx={{ bgcolor: '#FFF' }} />
          
          <Button 
            variant="contained" 
            size="large"
            startIcon={<FullscreenIcon />}
            sx={{ mt: 3, bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, px: 4, py: 1.5, fontWeight: 700 }} 
            onClick={handleStartFullscreen}
          >
            Enter Full Screen & Start
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <>
      <style>
        {`
          :fullscreen {
            background: #000;
          }
          :fullscreen #split-viewer-container {
            width: 100vw;
            height: 100vh;
          }
          #split-viewer-container {
            width: 100%;
            height: calc(100vh - 120px);
            display: flex;
            flex-direction: column;
            background: #000;
          }
        `}
      </style>
      <Box id="split-viewer-container">
        {/* Top Control Bar for Exiting */}
        {document.fullscreenElement && (
          <Box sx={{ width: '100%', p: 2, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.8)', zIndex: 50 }}>
             <Button variant="outlined" color="error" size="small" onClick={handleExitFullscreen} sx={{ fontWeight: 700 }}>
               Exit Comparison
             </Button>
          </Box>
        )}

        <Box 
          id="split-viewer" 
          sx={{ display: 'flex', width: '100%', flexGrow: 1, position: 'relative', background: '#000', overflow: 'hidden' }}
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
          <Box id="pane-after" sx={{ flex: '1 1 50%', height: '100%', position: 'relative', overflow: 'hidden', borderLeft: '2px solid #333' }}>
            <Box sx={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
              <div id="player-after" style={{ width: '100%', height: '100%' }} />
            </Box>
            <Box 
              sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5 }} 
              onClick={() => {}} 
            />
            <Typography 
              variant="caption" 
              sx={{ position: 'absolute', top: 12, left: 12, color: '#fff', background: 'rgba(0,0,0,0.7)', px: 1.5, py: 0.5, borderRadius: 1, zIndex: 10, fontWeight: 700 }}
            >
              AFTER
            </Typography>
          </Box>
        </Box>

        {/* Master Control Bar */}
        <Box 
          sx={{ 
            height: 'auto', background: '#1e1e1e', display: 'flex', flexDirection: 'column', 
            p: 2, zIndex: 20, borderTop: '1px solid #333'
          }}
        >
          <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 2, mb: 1 }}>
            <IconButton onClick={togglePlay} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </>
  );
};

export default SplitViewer;
