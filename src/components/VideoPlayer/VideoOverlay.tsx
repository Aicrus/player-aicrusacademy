import { useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface VideoOverlayProps {
  isPlaying: boolean;
  onPlay: () => void;
  onCloseContextMenu?: () => void;
  isLoading?: boolean;
}

export function VideoOverlay({ isPlaying, onPlay, onCloseContextMenu, isLoading }: VideoOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timeoutId = window.setTimeout(() => {
        setShowOverlay(false);
      }, 2000);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [isPlaying, isLoading]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    }
    
    if (onCloseContextMenu) {
      onCloseContextMenu();
    }
    
    setShowOverlay(true);
    onPlay();
  };

  const handleMouseEnter = () => {
    if (!isLoading) {
      setShowOverlay(true);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div 
      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
        showOverlay ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseEnter={handleMouseEnter}
    >
      <button
        className="p-4 md:p-6 rounded-full bg-white/10 backdrop-blur-sm hover:bg-[#1effb2]/20 transition group"
        onClick={handleClick}
      >
        {isPlaying ? (
          <Pause className="w-6 h-6 md:w-12 md:h-12 text-white fill-white group-hover:text-[#1effb2] group-hover:fill-[#1effb2]" />
        ) : (
          <Play className="w-6 h-6 md:w-12 md:h-12 text-white fill-white group-hover:text-[#1effb2] group-hover:fill-[#1effb2]" />
        )}
      </button>
    </div>
  );
}