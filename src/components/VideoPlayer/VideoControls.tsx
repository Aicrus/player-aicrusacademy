import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Settings,
  PictureInPicture2,
  Cast,
  RotateCcw,
  RotateCw,
  MessageSquare,
  Airplay,
} from 'lucide-react';
import { useVideoThumbnails } from '../../hooks/useVideoThumbnails';

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onTogglePiP: () => void;
  onToggleSettings: (e: React.MouseEvent) => void;
  onToggleCast: () => void;
  isCasting: boolean;
  quality: string;
  currentSubtitle: string;
  onSubtitleChange: (subtitleId: string) => void;
  lastSelectedSubtitle: string;
  videoId: string;
  onCloseContextMenu?: () => void;
  buffered: TimeRanges | null;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const buttonClass = "p-2 rounded-full transition-all duration-200 transform hover:scale-110 text-white hover:text-[#1effb2]";
const activeButtonClass = (isActive: boolean) => 
  `p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${isActive ? 'text-[#1effb2]' : 'text-white hover:text-[#1effb2]'}`;

const getQualityBadge = (quality: string) => {
  if (quality.includes('2160')) return '4K';
  if (quality.includes('1440')) return '2K';
  return null;
};

const Rewind10Button = () => (
  <div className="relative flex items-center justify-center w-5 h-5">
    <RotateCcw className="w-full h-full" />
    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold text-white drop-shadow-md">
      10
    </span>
  </div>
);

const Forward10Button = () => (
  <div className="relative flex items-center justify-center w-5 h-5">
    <RotateCw className="w-full h-full" />
    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold text-white drop-shadow-md">
      10
    </span>
  </div>
);

// Função para detectar o navegador e recursos
const getBrowser = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome')) {
    return 'chrome';
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('android')) {
    // Certifica que é realmente Safari em um dispositivo Apple
    return 'safari';
  }
  return 'other';
};

// Para o evento do AirPlay
interface WebKitPlaybackTargetAvailabilityEvent extends Event {
  availability: 'available' | 'not-available';
}

// Declare a interface do WebKit globalmente
declare global {
  interface Window {
    WebKitPlaybackTargetAvailabilityEvent: {
      prototype: WebKitPlaybackTargetAvailabilityEvent;
      new(): WebKitPlaybackTargetAvailabilityEvent;
    };
  }
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  onPlayPause,
  onSeek,
  onSkip,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onTogglePiP,
  onToggleSettings,
  onToggleCast,
  isCasting,
  quality,
  currentSubtitle,
  onSubtitleChange,
  lastSelectedSubtitle,
  videoId,
  onCloseContextMenu,
  buffered,
  videoRef,
}: VideoControlsProps) {
  const { getThumbnail, isInitialized } = useVideoThumbnails(videoId);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const thumbnailTimeoutRef = useRef<number>();
  const [browser] = useState(getBrowser());

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const volumeBarRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingVolumeRef = useRef(false);
  const isDraggingProgressRef = useRef(false);
  const [previewPosition, setPreviewPosition] = useState<{
    x: number;
    time: number;
    backgroundPosition: string;
    verticalOffset?: number;
  }>({
    x: 0,
    time: 0,
    backgroundPosition: '0 0'
  });
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    onSeek(pos * duration);
  };

  const handleVolumeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingVolumeRef.current = true;
    const rect = volumeBarRef.current?.getBoundingClientRect();
    if (rect) {
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onVolumeChange(pos);
    }
  };

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    isDraggingProgressRef.current = true;
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (rect) {
      const pos = (e.clientX - rect.left) / rect.width;
      onSeek(pos * duration);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingVolumeRef.current && volumeBarRef.current) {
        const rect = volumeBarRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onVolumeChange(pos);
        e.preventDefault();
      }
      
      if (isDraggingProgressRef.current && progressBarRef.current) {
        const rect = progressBarRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onSeek(pos * duration);
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      isDraggingProgressRef.current = false;
      isDraggingVolumeRef.current = false;
      document.body.style.userSelect = 'auto';
    };

    if (isDraggingVolumeRef.current || isDraggingProgressRef.current) {
      document.body.style.userSelect = 'none';
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'auto';
    };
  }, [onVolumeChange, onSeek, duration]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingProgressRef.current && progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      
      // Atualiza a posição da bolinha para seguir o cursor
      const handle = progressBarRef.current.querySelector('.video-progress-handle') as HTMLElement;
      if (handle) {
        handle.style.left = `${x}px`;
        handle.style.right = 'auto'; // Remove o right fixo
      }
      
      onSeek(percentage * duration);
    }
  }, [duration, onSeek]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  const getBufferedWidth = useCallback(() => {
    if (!buffered || buffered.length === 0) return 0;
    const currentBufferEnd = buffered.end(buffered.length - 1);
    return (currentBufferEnd / duration) * 100;
  }, [buffered, duration]);

  const handlePreviewMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (progressBarRef.current && isInitialized) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const time = percentage * duration;
      
      const previewWidth = 160;
      let previewX = x - (previewWidth / 2);
      
      if (previewX < 0) {
        previewX = 0;
      }
      
      if (previewX + previewWidth > rect.width) {
        previewX = rect.width - previewWidth;
      }
      
      setPreviewPosition({
        x: previewX,
        time,
        backgroundPosition: '0 0'
      });

      if (thumbnailTimeoutRef.current) {
        window.clearTimeout(thumbnailTimeoutRef.current);
      }

      thumbnailTimeoutRef.current = window.setTimeout(async () => {
        try {
          const thumbnail = await getThumbnail(time);
          if (thumbnail) {
            setThumbnailUrl(thumbnail);
          }
        } catch (error) {
          console.error('Error loading thumbnail:', error);
        }
      }, 100);
    }
  }, [duration, getThumbnail, isInitialized]);

  // Função para verificar se o Chromecast está disponível
  const isChromecastAvailable = useCallback(() => {
    return browser === 'chrome' && window.chrome?.cast?.isAvailable;
  }, [browser]);

  // Função para verificar se o AirPlay está disponível
  const isAirPlayAvailable = useCallback(() => {
    if (browser !== 'safari') return false;

    return (
      'webkitPlaybackTargetAvailabilityChanged' in HTMLVideoElement.prototype ||
      'webkitShowPlaybackTargetPicker' in HTMLVideoElement.prototype ||
      'webkitSupportsPresentationMode' in HTMLVideoElement.prototype ||
      typeof window.WebKitPlaybackTargetAvailabilityEvent !== 'undefined'
    );
  }, [browser]);

  // No JSX, vamos adicionar um listener para disponibilidade do AirPlay
  useEffect(() => {
    if (browser === 'safari' && videoRef.current) {
      const video = videoRef.current;
      
      const handlePlaybackTargetAvailabilityChanged = (
        event: WebKitPlaybackTargetAvailabilityEvent
      ) => {
        if (event.availability === 'available') {
          console.log('AirPlay disponível');
        }
      };

      try {
        // @ts-expect-error - API Safari
        video.addEventListener('webkitplaybacktargetavailabilitychanged', 
          handlePlaybackTargetAvailabilityChanged
        );
      } catch (error) {
        console.log('Erro ao adicionar listener de AirPlay:', error);
      }

      return () => {
        try {
          // @ts-expect-error - API Safari
          video.removeEventListener('webkitplaybacktargetavailabilitychanged',
            handlePlaybackTargetAvailabilityChanged
          );
        } catch (error) {
          console.log('Erro ao remover listener de AirPlay:', error);
        }
      };
    }
  }, [browser, videoRef]);

  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 p-2 sm:p-1 md:p-4 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${
        isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
      }`}
      onClick={onCloseContextMenu}
    >
      <div className="relative mb-2 sm:mb-1">
        <div 
          className="video-progress-container"
          onMouseEnter={() => setShowPreview(true)}
          onMouseLeave={() => setShowPreview(false)}
          onMouseMove={handlePreviewMove}
        >
          <div 
            ref={progressBarRef}
            className={`video-progress-bar ${isDragging ? 'dragging' : ''}`}
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
          >
            <div 
              className="video-progress-buffer"
              style={{ width: `${getBufferedWidth()}%` }}
            />
            <div
              className="video-progress-bar-fill"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            >
              <div 
                className="video-progress-handle"
                onMouseDown={handleProgressMouseDown}
              />
            </div>
          </div>

          {showPreview && (
            <div
              className="absolute bg-black/90 rounded overflow-hidden shadow-lg video-preview show"
              style={{ 
                left: previewPosition.x,
                bottom: '100%',
                marginBottom: '8px',
                width: '160px',
                height: '90px',
                zIndex: 2,
                transition: 'all 0.15s ease-out'
              }}
            >
              {thumbnailUrl ? (
                <img 
                  src={thumbnailUrl}
                  className="w-full h-full object-cover"
                  style={{
                    imageRendering: 'crisp-edges',
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden'
                  }}
                  alt="Preview"
                />
              ) : (
                <div className="w-full h-full bg-black/60 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white/90 rounded-full animate-spin" />
                </div>
              )}
              <div className="preview-time">
                {formatTime(previewPosition.time)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 md:gap-4 sm:gap-2 relative z-10">
        <div className="flex items-center gap-2 md:gap-2 sm:gap-1">
          <button
            className="p-2 md:p-2 sm:p-1 rounded-full transition-all duration-200 transform hover:scale-110 text-white hover:text-[#1effb2]"
            onClick={onPlayPause}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 md:w-5 md:h-5 sm:w-4 sm:h-4" />
            ) : (
              <Play className="w-5 h-5 md:w-5 md:h-5 sm:w-4 sm:h-4" />
            )}
          </button>
          <button
            className={buttonClass}
            title="Voltar 10 segundos"
            onClick={() => onSkip(-10)}
          >
            <Rewind10Button />
          </button>
          <button
            className={buttonClass}
            title="Avançar 10 segundos"
            onClick={() => onSkip(10)}
          >
            <Forward10Button />
          </button>
          <div className="flex items-center gap-1 group/volume">
            <button className={buttonClass} onClick={onToggleMute}>
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <div className="w-0 overflow-hidden group-hover/volume:w-[100px] transition-all duration-300">
              <div className="px-3">
                <div 
                  ref={volumeBarRef}
                  className="relative w-[70px] h-1 my-4 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    onVolumeChange(pos);
                  }}
                >
                  <div className="absolute inset-0">
                    <div className="absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 bg-white/30 rounded-full" />
                    
                    <div 
                      className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-[#1effb2] rounded-full"
                      style={{ width: `${volume * 100}%` }} 
                    />
                  </div>
                  
                  <div 
                    className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                    style={{ 
                      left: `${volume * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      boxShadow: '0 0 4px rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseDown={handleVolumeMouseDown}
                  />
                </div>
              </div>
            </div>
          </div>
          <span className="text-white text-xs md:text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lastSelectedSubtitle !== 'off' && (
            <button 
              className={`p-2 rounded-full transition-all duration-200 transform hover:scale-110 ${
                currentSubtitle !== 'off' ? 'text-[#1effb2]' : 'text-white hover:text-[#1effb2]'
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (currentSubtitle === 'off') {
                  onSubtitleChange(lastSelectedSubtitle);
                } else {
                  onSubtitleChange('off');
                }
              }}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          )}
          {isChromecastAvailable() && (
            <button 
              className={activeButtonClass(isCasting)} 
              onClick={onToggleCast}
            >
              <Cast className="w-5 h-5" />
            </button>
          )}
          {isAirPlayAvailable() && (
            <button 
              className={buttonClass}
              onClick={() => {
                if (!videoRef.current) return;
                
                try {
                  if ('webkitShowPlaybackTargetPicker' in videoRef.current) {
                    // @ts-expect-error - API Safari
                    videoRef.current.webkitShowPlaybackTargetPicker();
                  } else if ('webkitSupportsPresentationMode' in videoRef.current) {
                    // @ts-expect-error - API Safari
                    videoRef.current.webkitPresentationMode = 'pictureInPicture';
                  }
                } catch (error) {
                  console.log('Erro ao ativar AirPlay:', error);
                }
              }}
            >
              <Airplay className="w-5 h-5" />
            </button>
          )}
          <button className={buttonClass} onClick={onTogglePiP}>
            <PictureInPicture2 className="w-5 h-5" />
          </button>
          <div className="relative">
            <button 
              className={`settings-button ${buttonClass}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSettings(e);
              }}
            >
              <Settings className="w-5 h-5" />
              {getQualityBadge(quality) && (
                <div className="absolute -top-1 -right-1 text-[10px] font-bold bg-[#1effb2] text-black px-1 rounded-sm leading-tight">
                  {getQualityBadge(quality)}
                </div>
              )}
            </button>
          </div>
          <button className={buttonClass} onClick={onToggleFullscreen}>
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}