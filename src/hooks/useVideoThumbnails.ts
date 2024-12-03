import { useRef, useCallback, useEffect, useState } from 'react';
import Hls from 'hls.js';

interface ThumbnailCache {
  [key: string]: string;
}

interface VideoSegment {
  start: number;
  end: number;
  thumbnails: ThumbnailCache;
}

export function useVideoThumbnails(videoId: string) {
  const thumbnailVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const segmentsRef = useRef<Map<number, VideoSegment>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializa os elementos e HLS
  const initialize = useCallback(async () => {
    if (!thumbnailVideoRef.current) {
      thumbnailVideoRef.current = document.createElement('video');
      thumbnailVideoRef.current.crossOrigin = 'anonymous';
      thumbnailVideoRef.current.preload = 'auto';
      thumbnailVideoRef.current.muted = true;
      thumbnailVideoRef.current.style.width = '640px';
      thumbnailVideoRef.current.style.height = '360px';
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 320;
      canvasRef.current.height = 180;
    }

    if (!hlsInstanceRef.current && thumbnailVideoRef.current) {
      hlsInstanceRef.current = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        enableWorker: true,
      });

      hlsInstanceRef.current.loadSource(
        `https://vz-5534a473-9fc.b-cdn.net/${videoId}/playlist.m3u8`
      );
      hlsInstanceRef.current.attachMedia(thumbnailVideoRef.current);

      await new Promise<void>((resolve, reject) => {
        if (!hlsInstanceRef.current) return reject('No HLS instance');
        
        hlsInstanceRef.current.once(Hls.Events.MANIFEST_PARSED, () => {
          setIsInitialized(true);
          resolve();
        });
        
        hlsInstanceRef.current.once(Hls.Events.ERROR, (_, data) => {
          console.error('HLS Error:', data);
          reject(data);
        });
      });
    }
  }, [videoId]);

  const generateThumbnail = useCallback(async (time: number): Promise<string> => {
    if (!thumbnailVideoRef.current || !canvasRef.current) {
      await initialize();
      if (!thumbnailVideoRef.current || !canvasRef.current) {
        throw new Error('Failed to initialize video or canvas');
      }
    }

    const video = thumbnailVideoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get canvas context');
    }

    return new Promise((resolve, reject) => {
      const handleSeeked = () => {
        try {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.9);
          
          const segmentIndex = Math.floor(time / 10);
          const segment = segmentsRef.current.get(segmentIndex);
          if (segment) {
            segment.thumbnails[Math.floor(time)] = thumbnail;
          }
          
          video.removeEventListener('seeked', handleSeeked);
          resolve(thumbnail);
        } catch (error) {
          reject(error);
        }
      };

      const handleError = (e: ErrorEvent) => {
        video.removeEventListener('error', handleError);
        reject(e);
      };

      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('error', handleError);
      video.currentTime = time;
    });
  }, [initialize]);

  const loadSegment = useCallback(async (segmentIndex: number): Promise<void> => {
    if (segmentsRef.current.has(segmentIndex)) {
      return;
    }

    const segment: VideoSegment = {
      start: segmentIndex * 10,
      end: (segmentIndex + 1) * 10,
      thumbnails: {}
    };

    segmentsRef.current.set(segmentIndex, segment);

    try {
      // Gera thumbnails para cada segundo do segmento
      for (let time = segment.start; time < segment.end; time++) {
        await generateThumbnail(time);
      }
    } catch (error) {
      console.error('Error loading segment:', error);
      segmentsRef.current.delete(segmentIndex);
    }
  }, [generateThumbnail]);

  const getThumbnail = useCallback(async (time: number): Promise<string> => {
    try {
      if (!isInitialized) {
        await initialize();
      }

      const segmentIndex = Math.floor(time / 10);
      const segment = segmentsRef.current.get(segmentIndex);
      
      if (segment?.thumbnails[Math.floor(time)]) {
        return segment.thumbnails[Math.floor(time)];
      }

      if (!segment) {
        await loadSegment(segmentIndex);
        return getThumbnail(time);
      }

      return await generateThumbnail(time);
    } catch (error) {
      console.error('Error getting thumbnail:', error);
      return '';
    }
  }, [isInitialized, initialize, loadSegment, generateThumbnail]);

  useEffect(() => {
    const segments = segmentsRef.current;
    const init = async () => {
      try {
        await initialize();
        
        for (let i = 0; i < 3; i++) {
          await loadSegment(i);
        }
      } catch (error) {
        console.error('Error initializing thumbnails:', error);
      }
    };

    init();

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      if (thumbnailVideoRef.current) {
        thumbnailVideoRef.current = null;
      }
      if (canvasRef.current) {
        canvasRef.current = null;
      }
      segments.clear();
      setIsInitialized(false);
    };
  }, [initialize, loadSegment, videoId]);

  return {
    getThumbnail,
    isInitialized
  };
} 