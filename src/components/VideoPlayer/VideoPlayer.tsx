import React, { useState, useEffect, useRef } from 'react';
import { VideoControls } from './VideoControls';
import { VideoOverlay } from './VideoOverlay';
import { VideoSettings } from './VideoSettings';
import { useVideoPlayer } from './useVideoPlayer';

interface VideoPlayerProps {
  videoId: string;
}

export function VideoPlayer({ videoId }: VideoPlayerProps) {
  const player = useVideoPlayer(videoId);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [buffered, setBuffered] = useState<TimeRanges | null>(null);
  const [hasSubtitles, setHasSubtitles] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSubtitles = async () => {
      try {
        const subtitleUrl = `${window.location.origin}/player-aicrusacademy/subtitles/${videoId}/pt.vtt`;
        const response = await fetch(subtitleUrl);
        
        if (response.ok) {
          setHasSubtitles(true);
          if (!player.videoRef.current) return;

          const track = document.createElement('track');
          track.kind = 'subtitles';
          track.label = 'Português';
          track.srclang = 'pt';
          track.src = subtitleUrl;
          player.videoRef.current.appendChild(track);

          player.updateSubtitles([
            { id: 'off', label: 'Desativado' },
            { id: '0', label: 'Português' }
          ]);

          const handleTrackLoad = () => {
            if (player.videoRef.current?.textTracks[0]) {
              player.videoRef.current.textTracks[0].mode = 'disabled';
            }
          };

          track.addEventListener('load', handleTrackLoad);
          return () => track.removeEventListener('load', handleTrackLoad);
        } else {
          setHasSubtitles(false);
          player.updateSubtitles([]);
        }
      } catch (error) {
        console.error('Erro ao verificar legendas:', error);
        setHasSubtitles(false);
        player.updateSubtitles([]);
      }
    };

    checkSubtitles();
  }, [videoId, player, player.videoRef, player.updateSubtitles]);

  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handleProgress = () => {
      setBuffered(video.buffered);
    };

    video.addEventListener('progress', handleProgress);
    return () => video.removeEventListener('progress', handleProgress);
  }, []);

  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    // Função para iniciar a reprodução
    const startPlayback = async () => {
      try {
        // Verifica se há tempo salvo
        const savedTime = localStorage.getItem(`videoTime_${videoId}`);
        if (savedTime) {
          const time = parseFloat(savedTime);
          // Se o tempo salvo for menor que a duração total menos 0.5 segundos
          if (time < video.duration - 0.5) {
            video.currentTime = time;
          } else {
            // Se estiver próximo do fim, começa do início
            video.currentTime = 0;
            localStorage.removeItem(`videoTime_${videoId}`);
          }
        }

        // Tenta iniciar a reprodução
        await video.play();
      } catch (error) {
        console.log('Autoplay prevented:', error);
      }
    };

    // Inicia a reprodução quando o vídeo estiver pronto
    const handleLoadedMetadata = () => {
      startPlayback();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoId, player.videoRef]);

  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      // Só faz autoplay se o vídeo não tiver terminado
      if (!player.hasEnded) {
        video.play()
          .then(() => {
            setIsLoading(false);
            player.togglePlay();
          })
          .catch(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleError = () => {
      setIsLoading(false);
      setError('Erro ao carregar o vídeo');
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [player, player.togglePlay, player.hasEnded]);

  const handleMouseLeave = () => {
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
    }
    setShowContextMenu(false);
  };

  const handleToggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSettingsOpen(prev => !prev);
    setShowContextMenu(false);
  };

  const handlePlayerClick = (e: React.MouseEvent) => {
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
    }
    setShowContextMenu(false);

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
      return;
    }
    
    if (!(e.target as HTMLElement).closest('.video-controls')) {
      player.togglePlay();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const containerRect = player.containerRef.current?.getBoundingClientRect();
    const menuWidth = 160; // Largura aproximada do menu
    const menuHeight = 80; // Altura aproximada do menu
    
    if (containerRect) {
      let x = e.clientX - containerRect.left;
      let y = e.clientY - containerRect.top;
      
      // Ajusta a posição horizontal se estiver muito próximo da borda direita
      if (x + menuWidth > containerRect.width) {
        x = containerRect.width - menuWidth;
      }
      
      // Ajusta a posição vertical se estiver muito próximo da borda inferior
      if (y + menuHeight > containerRect.height) {
        y = containerRect.height - menuHeight;
      }
      
      setContextMenuPosition({ x, y });
      setShowContextMenu(true);
    }
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleReportError = () => {
    window.open('https://api.whatsapp.com/send?phone=5547989214925&text=Ol%C3%A1!%20%F0%9F%90%9B%20Gostaria%20de%20reportar%20um%20erro%20no%20player%20da%20Aicrus%20Academy', '_blank');
    setShowContextMenu(false);
  };

  const handleAicrusTech = () => {
    window.open('https://www.aicrustech.com/', '_blank');
    setShowContextMenu(false);
  };

  return (
    <div 
      ref={player.containerRef}
      className="video-container relative w-full h-full bg-black overflow-hidden group"
      onClick={handlePlayerClick}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#1effb2]/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full border-4 border-[#1effb2]/30 border-t-[#1effb2] animate-spin" />
          </div>
        </div>
      )}

      <video
        ref={player.videoRef}
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onTimeUpdate={player.handleTimeUpdate}
        onLoadedMetadata={player.handleLoadedMetadata}
        onError={(e) => {
          console.error('Video error:', e);
          setError('Erro ao carregar o vídeo');
        }}
        playsInline
        controls={false}
        crossOrigin="anonymous"
      />
      
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-white bg-black/80">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <VideoOverlay 
            isPlaying={player.isPlaying} 
            onPlay={player.togglePlay}
            onCloseContextMenu={handleCloseContextMenu}
            isLoading={isLoading}
          />
          
          <div className="video-controls absolute bottom-0 left-0 right-0" onClick={(e) => e.stopPropagation()}>
            <VideoControls
              isPlaying={player.isPlaying}
              currentTime={player.currentTime}
              duration={player.duration}
              volume={player.volume}
              isMuted={player.isMuted}
              onPlayPause={player.togglePlay}
              onSeek={player.seek}
              onSkip={player.skip}
              onVolumeChange={player.handleVolumeChange}
              onToggleMute={player.toggleMute}
              onToggleFullscreen={player.toggleFullscreen}
              onTogglePiP={player.togglePictureInPicture}
              onToggleSettings={handleToggleSettings}
              onToggleCast={player.toggleCast}
              isCasting={player.isCasting}
              quality={player.quality}
              currentSubtitle={player.currentSubtitle}
              onSubtitleChange={player.setVideoSubtitle}
              lastSelectedSubtitle={player.lastSelectedSubtitle}
              videoId={videoId}
              onCloseContextMenu={handleCloseContextMenu}
              buffered={buffered}
              videoRef={player.videoRef}
            />
          </div>
        </>
      )}
      
      <div onClick={(e) => e.stopPropagation()}>
        <VideoSettings
          isOpen={isSettingsOpen}
          quality={player.quality}
          playbackSpeed={player.playbackSpeed}
          availableQualities={player.availableQualities}
          onQualityChange={player.setVideoQuality}
          onPlaybackSpeedChange={player.setVideoPlaybackSpeed}
          subtitles={hasSubtitles ? player.subtitles : []}
          currentSubtitle={player.currentSubtitle}
          onSubtitleChange={player.setVideoSubtitle}
          hasSubtitles={hasSubtitles}
        />
      </div>

      {showContextMenu && (
        <div 
          ref={contextMenuRef}
          className="absolute bg-black/60 backdrop-blur-sm rounded-md py-0.5 z-50 shadow-lg border border-white/5 context-menu"
          style={{ 
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            minWidth: '160px'
          }}
        >
          <button
            className="w-full px-3 py-1.5 text-xs text-white/90 hover:bg-red-500/10 hover:text-red-500 text-left flex items-center gap-2 transition-colors"
            onClick={handleReportError}
          >
            <span className="text-white/50">⚠️</span>
            <span>Reportar bug</span>
          </button>
          <button
            className="w-full px-3 py-1.5 text-xs text-white/90 hover:bg-[#1effb2]/10 hover:text-[#1effb2] text-left flex items-center gap-2 transition-colors"
            onClick={handleAicrusTech}
          >
            <span className="text-white/50">🚀</span>
            <span>Aicrus Tech</span>
          </button>
        </div>
      )}
    </div>
  );
}