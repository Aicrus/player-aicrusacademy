import React, { useState } from 'react';
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

  const handleMouseLeave = () => {
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
    }
  };

  const handleToggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSettingsOpen(prev => !prev);
  };

  const handlePlayerClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.video-controls')) {
      player.togglePlay();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Previne o menu padrão do navegador
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleReportError = () => {
    window.open('https://api.whatsapp.com/send?phone=5547989214925&text=Ol%C3%A1!%20%F0%9F%90%9B%20Gostaria%20de%20reportar%20um%20erro%20no%20player%20da%20Aicrus%20Academy', '_blank');
    setShowContextMenu(false);
  };

  const thumbnailsUrl = `https://vz-5534a473-9fc.b-cdn.net/${videoId}/thumbnails.vtt`;

  return (
    <div 
      ref={player.containerRef}
      className="video-container relative w-full max-w-5xl mx-auto aspect-video bg-black rounded-lg overflow-hidden group"
      onClick={handlePlayerClick}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
    >
      <video
        ref={player.videoRef}
        className="w-full h-full object-contain"
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
          <VideoOverlay isPlaying={player.isPlaying} onPlay={player.togglePlay} />
          
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
              onToggleSettings={(e: React.MouseEvent) => handleToggleSettings(e)}
              thumbnailsUrl={thumbnailsUrl}
              onToggleCast={player.toggleCast}
              isCasting={player.isCasting}
              quality={player.quality}
              currentSubtitle={player.currentSubtitle}
              subtitles={player.subtitles}
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
          subtitles={player.subtitles}
          currentSubtitle={player.currentSubtitle}
          onSubtitleChange={player.setVideoSubtitle}
        />
      </div>

      {showContextMenu && (
        <div 
          className="fixed bg-black/60 backdrop-blur-sm rounded-md py-0.5 z-50 shadow-lg border border-white/5"
          style={{ 
            left: contextMenuPosition.x, 
            top: contextMenuPosition.y,
            minWidth: '160px'
          }}
        >
          <button
            className="w-full px-3 py-1.5 text-xs text-white/90 hover:bg-white/10 text-left flex items-center gap-2 transition-colors"
            onClick={handleReportError}
          >
            <span className="text-white/50">🐛</span>
            <span>Reportar bug</span>
          </button>
        </div>
      )}
    </div>
  );
}