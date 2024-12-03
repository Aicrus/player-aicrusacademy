import { useState, useRef, useCallback, useEffect } from 'react';
import { VideoPlayerHook } from '../types/player';

export function useVideoPlayer(videoId: string): VideoPlayerHook {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [subtitles, setSubtitles] = useState<Array<{ id: string; label: string }>>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState('off');
  const [lastSelectedSubtitle, setLastSelectedSubtitle] = useState('off');
  const [hasEnded, setHasEnded] = useState(false);

  const initVideo = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    initVideo();
  }, [videoId, initVideo]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (hasEnded) {
      setHasEnded(false);
    }

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, hasEnded]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = value;
    setVolume(value);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const updateSubtitles = useCallback((newSubtitles: Array<{ id: string; label: string }>) => {
    setSubtitles(newSubtitles);
  }, []);

  const setVideoSubtitle = useCallback((subtitleId: string) => {
    setCurrentSubtitle(subtitleId);
    setLastSelectedSubtitle(subtitleId);
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (!videoRef.current) return;
    
    videoRef.current.currentTime = 0;
    setIsPlaying(false);
    setHasEnded(true);
    
    localStorage.removeItem(`videoTime_${videoId}`);
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
    setIsPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleVolumeChange,
    toggleMute,
    subtitles,
    currentSubtitle,
    setVideoSubtitle,
    lastSelectedSubtitle,
    updateSubtitles,
    hasEnded
  };
}