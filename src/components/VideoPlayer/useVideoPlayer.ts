import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface QualityLevel {
  height: number;
  bitrate: number;
}

interface ChromeCastMediaRequest {
  media: {
    contentId: string;
    contentType: string;
  };
}

interface ChromeCastSession {
  stop: () => Promise<void>;
  loadMedia: (request: ChromeCastMediaRequest) => Promise<void>;
  mediaSession?: {
    seek: (options: { currentTime: number }) => void;
  };
}

export function useVideoPlayer(videoId: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const castSessionRef = useRef<ChromeCastSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const savedVolume = localStorage.getItem(`videoVolume_${videoId}`);
    return savedVolume ? parseFloat(savedVolume) : 1;
  });
  const [isMuted, setIsMuted] = useState(() => {
    const savedMuted = localStorage.getItem(`videoMuted_${videoId}`);
    return savedMuted ? savedMuted === 'true' : false;
  });
  const [quality, setQuality] = useState(() => {
    const savedQuality = localStorage.getItem(`videoQuality_${videoId}`);
    return savedQuality || 'auto';
  });
  const [availableQualities, setAvailableQualities] = useState<QualityLevel[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    const savedSpeed = localStorage.getItem(`videoSpeed_${videoId}`);
    return savedSpeed ? parseFloat(savedSpeed) : 1;
  });
  const [subtitles, setSubtitles] = useState<Array<{ id: string; label: string }>>([
    { id: 'off', label: 'Desativado' }
  ]);
  const [currentSubtitle, setCurrentSubtitle] = useState('off');
  const [lastSelectedSubtitle, setLastSelectedSubtitle] = useState('off');
  const [isCasting, setIsCasting] = useState(false);
  const [castInitialized, setCastInitialized] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (hasEnded) {
        setHasEnded(false);
      }
      
      if (isPlaying) {
        videoRef.current.pause();
        console.log('Salvando tempo no pause:', videoRef.current.currentTime);
        localStorage.setItem(`videoTime_${videoId}`, videoRef.current.currentTime.toString());
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, videoId, hasEnded]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      setCurrentTime(currentTime);
      
      if (currentTime > 0 && currentTime < videoRef.current.duration - 0.5) {
        console.log('Salvando tempo:', currentTime);
        localStorage.setItem(`videoTime_${videoId}`, currentTime.toString());
      } else if (currentTime >= videoRef.current.duration - 0.5) {
        localStorage.removeItem(`videoTime_${videoId}`);
        videoRef.current.pause();
        setIsPlaying(false);
        setHasEnded(true);
      }
    }
  }, [videoId]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      if (time < videoRef.current.duration - 0.5) {
        console.log('Salvando tempo no seek:', time);
        localStorage.setItem(`videoTime_${videoId}`, time.toString());
      }
    }
  }, [videoId]);

  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      const newTime = videoRef.current.currentTime + seconds;
      seek(Math.max(0, Math.min(newTime, duration)));
    }
  }, [duration, seek]);

  const handleVolumeChange = useCallback((value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value;
      setVolume(value);
      setIsMuted(value === 0);
      localStorage.setItem(`videoVolume_${videoId}`, value.toString());
    }
  }, [videoId]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      localStorage.setItem(`videoMuted_${videoId}`, newMuted.toString());
      if (!newMuted && volume === 0) {
        handleVolumeChange(1);
      }
    }
  }, [isMuted, volume, videoId, handleVolumeChange]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error('Erro no fullscreen:', error);
    }
  }, []);

  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        if (currentSubtitle !== 'off') {
          const tracks = videoRef.current.textTracks;
          Array.from(tracks).forEach(track => {
            track.mode = 'disabled';
          });
          setCurrentSubtitle('off');
        }
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Erro no PiP:', error);
    }
  }, [currentSubtitle]);

  const setVideoQuality = useCallback((level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      const newQuality = level === -1 ? 'auto' : `${hlsRef.current.levels[level].height}p`;
      setQuality(newQuality);
      localStorage.setItem(`videoQuality_${videoId}`, newQuality);
    }
  }, [videoId]);

  const setVideoPlaybackSpeed = useCallback((speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      localStorage.setItem(`videoSpeed_${videoId}`, speed.toString());
    }
  }, [videoId]);

  const setVideoSubtitle = useCallback((subtitleId: string) => {
    const video = videoRef.current;
    if (!video) return;

    Array.from(video.textTracks).forEach(track => {
      track.mode = 'disabled';
    });

    if (subtitleId === 'off') {
      setCurrentSubtitle('off');
    } else {
      const trackIndex = parseInt(subtitleId);
      if (!isNaN(trackIndex) && video.textTracks[trackIndex]) {
        video.textTracks[trackIndex].mode = 'showing';
        setCurrentSubtitle(subtitleId);
        setLastSelectedSubtitle(subtitleId);
      }
    }

    localStorage.setItem(`videoSubtitle_${videoId}`, subtitleId);
  }, [videoId]);

  const initializeCastApi = useCallback(() => {
    try {
      const sessionRequest = new window.chrome.cast.SessionRequest(
        window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
      );

      const apiConfig = new window.chrome.cast.ApiConfig(
        sessionRequest,
        (session: ChromeCastSession) => {
          console.log('Sessão existente encontrada');
          castSessionRef.current = session;
          setIsCasting(true);
        },
        (availability: string) => {
          console.log('Receiver found?', availability === 'available');
        },
        'ORIGIN_SCOPED'
      );

      window.chrome.cast.initialize(
        apiConfig,
        () => {
          console.log('Chromecast inicializado com sucesso');
          setCastInitialized(true);
        },
        (error: Error) => console.error('Erro ao inicializar Chromecast:', error)
      );
    } catch (error) {
      console.error('Erro ao configurar Chromecast:', error);
    }
  }, []);

  const toggleCast = useCallback(async () => {
    if (!castInitialized) {
      console.warn('Chromecast ainda não foi inicializado');
      return;
    }

    if (isCasting) {
      try {
        if (castSessionRef.current) {
          await castSessionRef.current.stop();
          castSessionRef.current = null;
          setIsCasting(false);
        }
      } catch (error) {
        console.error('Erro ao parar o Chromecast:', error);
      }
    } else {
      try {
        const session = await new Promise<ChromeCastSession>((resolve, reject) => {
          window.chrome.cast.requestSession(resolve, reject);
        });

        castSessionRef.current = session;
        setIsCasting(true);

        const mediaInfo = new window.chrome.cast.media.MediaInfo(
          `https://vz-5534a473-9fc.b-cdn.net/${videoId}/playlist.m3u8`,
          'application/x-mpegURL'
        );

        const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
        await session.loadMedia(request);

        if (videoRef.current && session.mediaSession) {
          const currentTime = videoRef.current.currentTime;
          session.mediaSession.seek({ currentTime });
        }
      } catch (error) {
        console.error('Erro ao iniciar o Chromecast:', error);
        setIsCasting(false);
      }
    }
  }, [castInitialized, isCasting, videoId]);

  const updateSubtitles = useCallback((newSubtitles: Array<{ id: string; label: string }>) => {
    setSubtitles(newSubtitles);
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (!videoRef.current) return;
    
    // Volta para o início do vídeo
    videoRef.current.currentTime = 0;
    // Para a reprodução
    setIsPlaying(false);
    setHasEnded(true);
    
    // Remove o tempo salvo quando o vídeo termina
    localStorage.removeItem(`videoTime_${videoId}`);
  }, [videoId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.chrome?.cast?.isAvailable) {
      initializeCastApi();
    } else {
      window.__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable) {
          initializeCastApi();
        }
      };
    }

    return () => {
      window.__onGCastApiAvailable = undefined;
    };
  }, [initializeCastApi]);

  useEffect(() => {
    const loadVideo = async () => {
      if (!videoRef.current) return;

      try {
        const hls = new Hls({
          maxMaxBufferLength: 60,
          backBufferLength: 60,
        });

        hlsRef.current = hls;

        hls.loadSource(`https://vz-5534a473-9fc.b-cdn.net/${videoId}/playlist.m3u8`);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (hls.levels.length > 0) {
            setAvailableQualities(hls.levels);
          }

          const savedQuality = localStorage.getItem(`videoQuality_${videoId}`);
          if (savedQuality) {
            if (savedQuality === 'auto') {
              hls.currentLevel = -1;
              setQuality('auto');
            } else {
              const height = parseInt(savedQuality);
              const levelIndex = hls.levels.findIndex(level => level.height === height);
              if (levelIndex !== -1) {
                hls.currentLevel = levelIndex;
                setQuality(`${height}p`);
              }
            }
          }
          
          const savedSpeed = localStorage.getItem(`videoSpeed_${videoId}`);
          if (savedSpeed && videoRef.current) {
            const speed = parseFloat(savedSpeed);
            videoRef.current.playbackRate = speed;
            setPlaybackSpeed(speed);
          }

          const savedTime = localStorage.getItem(`videoTime_${videoId}`);
          if (savedTime && videoRef.current) {
            const time = parseFloat(savedTime);
            videoRef.current.currentTime = time;
            setCurrentTime(time);
          }
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const newQuality = data.level === -1 ? 'auto' : `${hls.levels[data.level].height}p`;
          setQuality(newQuality);
          localStorage.setItem(`videoQuality_${videoId}`, newQuality);
        });

      } catch (error) {
        console.error('Erro ao carregar vídeo:', error);
      }
    };

    loadVideo();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [videoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('ended', handleVideoEnded);

    return () => {
      video.removeEventListener('ended', handleVideoEnded);
    };
  }, [handleVideoEnded]);

  return {
    videoRef,
    containerRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    quality,
    playbackSpeed,
    availableQualities,
    subtitles,
    currentSubtitle,
    lastSelectedSubtitle,
    isCasting,
    hasEnded,
    togglePlay,
    seek,
    skip,
    handleVolumeChange,
    toggleMute,
    handleTimeUpdate,
    handleLoadedMetadata,
    toggleFullscreen,
    togglePictureInPicture,
    setVideoQuality,
    setVideoPlaybackSpeed,
    setVideoSubtitle,
    toggleCast,
    updateSubtitles
  };
}