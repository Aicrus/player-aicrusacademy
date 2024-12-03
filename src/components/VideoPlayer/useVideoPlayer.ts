import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface QualityLevel {
  height: number;
  bitrate: number;
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
  const [availableQualities] = useState<QualityLevel[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    const savedSpeed = localStorage.getItem(`videoSpeed_${videoId}`);
    return savedSpeed ? parseFloat(savedSpeed) : 1;
  });
  const [subtitles] = useState<Array<{ id: string; label: string }>>([
    { id: 'off', label: 'Desativado' }
  ]);
  const [currentSubtitle, setCurrentSubtitle] = useState('off');
  const [isCasting, setIsCasting] = useState(false);
  const [castInitialized, setCastInitialized] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        console.log('Salvando tempo no pause:', videoRef.current.currentTime);
        localStorage.setItem(`videoTime_${videoId}`, videoRef.current.currentTime.toString());
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      setCurrentTime(currentTime);
      
      if (currentTime > 0 && currentTime < videoRef.current.duration - 0.5) {
        console.log('Salvando tempo:', currentTime);
        localStorage.setItem(`videoTime_${videoId}`, currentTime.toString());
      } else if (currentTime >= videoRef.current.duration - 0.5) {
        localStorage.removeItem(`videoTime_${videoId}`);
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const seek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      if (time < videoRef.current.duration - 0.5) {
        console.log('Salvando tempo no seek:', time);
        localStorage.setItem(`videoTime_${videoId}`, time.toString());
      }
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      const newTime = videoRef.current.currentTime + seconds;
      seek(Math.max(0, Math.min(newTime, duration)));
    }
  };

  const handleVolumeChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value;
      setVolume(value);
      setIsMuted(value === 0);
      localStorage.setItem(`videoVolume_${videoId}`, value.toString());
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      localStorage.setItem(`videoMuted_${videoId}`, newMuted.toString());
      if (!newMuted && volume === 0) {
        handleVolumeChange(1);
      }
    }
  };

  const toggleFullscreen = async () => {
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
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Erro no PiP:', error);
    }
  };

  const setVideoQuality = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      const newQuality = level === -1 ? 'auto' : `${hlsRef.current.levels[level].height}p`;
      setQuality(newQuality);
      localStorage.setItem(`videoQuality_${videoId}`, newQuality);
    }
  };

  const setVideoPlaybackSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      localStorage.setItem(`videoSpeed_${videoId}`, speed.toString());
    }
  };

  const setVideoSubtitle = (subtitleId: string) => {
    const video = videoRef.current;
    if (!video) return;

    console.log('=== Alterando Legenda ===');
    console.log('ID:', subtitleId);
    console.log('Tracks disponíveis:', Array.from(video.textTracks).map(track => ({
      label: track.label,
      mode: track.mode,
      kind: track.kind,
      language: track.language
    })));

    // Primeiro, desativar todas as legendas
    Array.from(video.textTracks).forEach(track => {
      track.mode = 'disabled';
    });

    if (subtitleId === 'off') {
      setCurrentSubtitle('off');
    } else {
      const trackIndex = parseInt(subtitleId);
      if (!isNaN(trackIndex) && video.textTracks[trackIndex]) {
        const track = video.textTracks[trackIndex];
        track.mode = 'showing';
        console.log('Legenda ativada:', {
          label: track.label,
          mode: track.mode,
          kind: track.kind,
          language: track.language
        });
        setCurrentSubtitle(subtitleId);
      }
    }

    localStorage.setItem(`videoSubtitle_${videoId}`, subtitleId);
  };

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

  const toggleCast = async () => {
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

        // Sincronizar o tempo atual
        if (videoRef.current && session.mediaSession) {
          const currentTime = videoRef.current.currentTime;
          session.mediaSession.seek({ currentTime });
        }
      } catch (error) {
        console.error('Erro ao iniciar o Chromecast:', error);
        setIsCasting(false);
      }
    }
  };

  // Efeito para salvar o progresso periodicamente
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const saveInterval = setInterval(() => {
      if (video.currentTime > 0 && video.currentTime < video.duration - 0.5) {
        console.log('Salvando tempo no intervalo:', video.currentTime);
        localStorage.setItem(`videoTime_${videoId}`, video.currentTime.toString());
      }
    }, 1000);

    return () => {
      clearInterval(saveInterval);
      if (video.currentTime > 0 && video.currentTime < video.duration - 0.5) {
        console.log('Salvando tempo no cleanup:', video.currentTime);
        localStorage.setItem(`videoTime_${videoId}`, video.currentTime.toString());
      }
    };
  }, [videoId]);

  // Carregar o tempo salvo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const loadSavedTime = () => {
      const savedTime = localStorage.getItem(`videoTime_${videoId}`);
      console.log('Tentando carregar tempo salvo:', savedTime);
      if (savedTime) {
        const time = parseFloat(savedTime);
        video.currentTime = time;
        setCurrentTime(time);
        console.log('Tempo carregado com sucesso:', time);
      }
    };

    if (Hls.isSupported()) {
      const videoUrl = `https://vz-5534a473-9fc.b-cdn.net/${videoId}/playlist.m3u8`;
      
      const hls = new Hls({
        debug: false,
        enableWebVTT: true,
        enableCEA708Captions: true,
        autoStartLoad: true,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        }
      });

      hlsRef.current = hls;
      
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      // Carregar o tempo salvo quando o manifesto for analisado
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setTimeout(loadSavedTime, 500);
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = `https://vz-5534a473-9fc.b-cdn.net/${videoId}/playlist.m3u8`;
      video.addEventListener('loadedmetadata', loadSavedTime);
      
      return () => {
        video.removeEventListener('loadedmetadata', loadSavedTime);
      };
    }
  }, [videoId]);

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
    isCasting,
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
    toggleCast
  };
}