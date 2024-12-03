import { Play, Pause } from 'lucide-react';

interface VideoOverlayProps {
  isPlaying: boolean;
  onPlay: () => void;
}

export function VideoOverlay({ isPlaying, onPlay }: VideoOverlayProps) {
  return (
    <div 
      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
        isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
      }`}
    >
      <button
        className="p-6 rounded-full bg-white/10 backdrop-blur-sm hover:bg-[#1effb2]/20 transition group"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPlay();
        }}
      >
        {isPlaying ? (
          <Pause className="w-12 h-12 text-white fill-white group-hover:text-[#1effb2] group-hover:fill-[#1effb2]" />
        ) : (
          <Play className="w-12 h-12 text-white fill-white group-hover:text-[#1effb2] group-hover:fill-[#1effb2]" />
        )}
      </button>
    </div>
  );
}