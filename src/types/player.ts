export interface VideoPlayerHook {
  videoRef: React.RefObject<HTMLVideoElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  togglePlay: () => void;
  handleTimeUpdate: () => void;
  handleLoadedMetadata: () => void;
  handleVolumeChange: (value: number) => void;
  toggleMute: () => void;
  subtitles: Array<{ id: string; label: string }>;
  currentSubtitle: string;
  setVideoSubtitle: (subtitleId: string) => void;
  lastSelectedSubtitle: string;
  updateSubtitles: (newSubtitles: Array<{ id: string; label: string }>) => void;
  hasEnded: boolean;
} 