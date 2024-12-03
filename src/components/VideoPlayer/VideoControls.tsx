import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Settings,
  Subtitles,
  PictureInPicture2,
  Cast,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

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
  thumbnailsUrl?: string;
  onToggleCast: () => void;
  isCasting: boolean;
  quality: string;
  currentSubtitle: string;
  subtitles: Array<{ id: string; label: string }>;
}

interface PreviewPosition {
  x: number;
  time: number;
  backgroundPosition: string;
}

// Classe base para todos os botões de controle
const buttonClass = "p-2 rounded-full transition-all duration-200 transform hover:scale-110 text-white hover:text-[#1effb2]";

// Para botões que podem ter estado ativo (como o Chromecast)
const activeButtonClass = (isActive: boolean) => 
  `${buttonClass} ${isActive ? 'text-[#1effb2]' : 'text-white hover:text-[#1effb2]'}`;

// Adicione esta função auxiliar no início do componente
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
  thumbnailsUrl,
  onToggleCast,
  isCasting,
  quality,
  currentSubtitle,
  subtitles,
}: VideoControlsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    onSeek(pos * duration);
  };

  const volumeBarRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingVolumeRef = useRef(false);
  const isDraggingProgressRef = useRef(false);
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition>({
    x: 0,
    time: 0,
    backgroundPosition: '0 0'
  });
  const [showPreview, setShowPreview] = useState(false);

  // Handler para o volume
  const handleVolumeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingVolumeRef.current = true;
    const rect = volumeBarRef.current?.getBoundingClientRect();
    if (rect) {
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onVolumeChange(pos);
    }
  };

  // Handler para o progresso do vídeo
  const handleProgressMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingProgressRef.current = true;
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (rect) {
      const pos = (e.clientX - rect.left) / rect.width;
      onSeek(pos * duration);
    }
  };

  // Handlers globais de mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Para o volume
      if (isDraggingVolumeRef.current && volumeBarRef.current) {
        const rect = volumeBarRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onVolumeChange(pos);
        e.preventDefault(); // Prevenir seleção de texto durante o arraste
      }
      
      // Para o progresso do vídeo
      if (isDraggingProgressRef.current && progressBarRef.current) {
        const rect = progressBarRef.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onSeek(pos * duration);
        e.preventDefault(); // Prevenir seleção de texto durante o arraste
      }
    };

    const handleMouseUp = () => {
      isDraggingVolumeRef.current = false;
      isDraggingProgressRef.current = false;
      document.body.style.userSelect = 'auto'; // Restaurar seleção de texto
    };

    if (isDraggingVolumeRef.current || isDraggingProgressRef.current) {
      document.body.style.userSelect = 'none'; // Prevenir seleção de texto durante o arraste
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'auto'; // Garantir que a seleção de texto seja restaurada
    };
  }, [onVolumeChange, onSeek, duration]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const time = percentage * duration;
      
      const thumbnailsPerRow = 5;
      const thumbnailWidth = 160;
      const thumbnailHeight = 90;
      
      const thumbnailIndex = Math.floor((time / duration) * 100);
      const row = Math.floor(thumbnailIndex / thumbnailsPerRow);
      const col = thumbnailIndex % thumbnailsPerRow;
      
      setPreviewPosition({
        x: Math.max(0, Math.min(x - thumbnailWidth/2, rect.width - thumbnailWidth)),
        time,
        backgroundPosition: `-${col * thumbnailWidth}px -${row * thumbnailHeight}px`
      });
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
      <div 
        ref={progressBarRef}
        className="video-progress-bar mb-4 relative"
        onClick={handleProgressClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
      >
        <div
          className="video-progress-bar-fill"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        >
          <div 
            className="video-progress-handle absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full transform scale-0 group-hover:scale-100 transition-transform cursor-grab active:cursor-grabbing"
            onMouseDown={handleProgressMouseDown}
          />
        </div>

        {showPreview && thumbnailsUrl && (
          <div
            className="absolute bottom-8 -translate-x-1/2 bg-black/90 rounded overflow-hidden shadow-lg"
            style={{ 
              left: previewPosition.x + 80,
              width: '160px',
              height: '90px'
            }}
          >
            <div
              className="w-full h-full bg-cover"
              style={{
                backgroundImage: `url(${thumbnailsUrl})`,
                backgroundPosition: previewPosition.backgroundPosition
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-white bg-black/60 py-1">
              {formatTime(previewPosition.time)}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            className={buttonClass}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlayPause();
            }}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
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
              <div className="px-3"> {/* Container com padding para proteger a bolinha */}
                <div 
                  ref={volumeBarRef}
                  className="relative w-[70px] h-1 my-4 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    onVolumeChange(pos);
                  }}
                >
                  {/* Container para centralizar a barra */}
                  <div className="absolute inset-0">
                    {/* Linha de fundo */}
                    <div className="absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 bg-white/30 rounded-full" />
                    
                    {/* Linha de progresso */}
                    <div 
                      className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-[#1effb2] rounded-full"
                      style={{ width: `${volume * 100}%` }} 
                    />
                  </div>
                  
                  {/* Bolinha de controle */}
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
          <span className="text-white text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            className={activeButtonClass(currentSubtitle !== 'off')}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSettings(e);
            }}
          >
            <Subtitles className="w-5 h-5" />
          </button>
          <button className={activeButtonClass(isCasting)} onClick={onToggleCast}>
            <Cast className="w-5 h-5" />
          </button>
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