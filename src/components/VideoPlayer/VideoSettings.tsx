import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

interface VideoSettingsProps {
  isOpen: boolean;
  quality: string;
  playbackSpeed: number;
  availableQualities: { height: number; bitrate: number }[];
  onQualityChange: (level: number) => void;
  onPlaybackSpeedChange: (speed: number) => void;
  subtitles: Array<{ id: string; label: string }>;
  currentSubtitle: string;
  onSubtitleChange: (subtitleId: string) => void;
  hasSubtitles: boolean;
}

type SettingsMenu = 'main' | 'quality' | 'speed' | 'subtitles';

export function VideoSettings({
  isOpen,
  quality,
  playbackSpeed,
  availableQualities,
  onQualityChange,
  onPlaybackSpeedChange,
  subtitles,
  currentSubtitle,
  onSubtitleChange,
  hasSubtitles
}: VideoSettingsProps) {
  const [currentMenu, setCurrentMenu] = useState<SettingsMenu>('main');

  if (!isOpen) return null;

  const speeds = [
    { label: '0.25x', value: 0.25 },
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: 'Normal', value: 1 },
    { label: '1.25x', value: 1.25 },
    { label: '1.5x', value: 1.5 },
    { label: '1.75x', value: 1.75 },
    { label: '2x', value: 2 }
  ];

  const getQualityLabel = (height: number) => {
    if (height >= 2160) return '4K';
    if (height >= 1440) return '2K';
    if (height >= 1080) return 'Full HD';
    if (height >= 720) return 'HD';
    return `${height}p`;
  };

  const qualities = [
    { label: 'Automático', value: -1 },
    ...availableQualities
      .sort((a, b) => b.height - a.height)
      .map((q, index) => ({
        label: getQualityLabel(q.height),
        value: index
      }))
  ];

  const getCurrentQualityLabel = () => {
    if (quality === 'auto') return 'Automático';
    const height = parseInt(quality);
    return getQualityLabel(height);
  };

  const getCurrentSpeedLabel = () => {
    return playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`;
  };

  const menuItemClass = "w-full px-3 py-1.5 text-xs md:text-sm text-white text-left hover:bg-[#1effb2]/10 hover:text-[#1effb2] rounded transition flex items-center justify-between";
  const backButtonClass = "w-full px-3 py-1.5 text-xs md:text-sm text-white text-left hover:bg-[#1effb2]/10 hover:text-[#1effb2] rounded transition flex items-center gap-2";
  const optionButtonClass = (isActive: boolean) => 
    `w-full px-3 py-1 text-xs md:text-sm text-left rounded transition ${
      isActive
        ? 'text-[#1effb2] bg-[#1effb2]/10'
        : 'text-white hover:bg-[#1effb2]/10 hover:text-[#1effb2]'
    }`;

  const renderMainMenu = () => (
    <div className="space-y-0.5">
      <button
        className={menuItemClass}
        onClick={() => setCurrentMenu('quality')}
      >
        <span>Qualidade</span>
        <span className="text-white/60">{getCurrentQualityLabel()}</span>
      </button>
      <button
        className={menuItemClass}
        onClick={() => setCurrentMenu('speed')}
      >
        <span>Velocidade</span>
        <span className="text-white/60">{getCurrentSpeedLabel()}</span>
      </button>
      {hasSubtitles && (
        <button
          className={menuItemClass}
          onClick={() => setCurrentMenu('subtitles')}
        >
          <span>Legendas</span>
          <span className="text-white/60">
            {subtitles.find(s => s.id === currentSubtitle)?.label || 'Desativado'}
          </span>
        </button>
      )}
    </div>
  );

  const renderQualityMenu = () => (
    <div className="space-y-0.5">
      <button
        className={backButtonClass}
        onClick={() => setCurrentMenu('main')}
      >
        <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
        <span>Qualidade</span>
      </button>
      <div className="mt-1 space-y-0.5">
        {qualities.map((q) => {
          const isAuto = q.value === -1;
          const currentHeight = isAuto ? 'auto' : availableQualities[q.value]?.height;
          const isActive = isAuto ? quality === 'auto' : quality === `${currentHeight}p`;
          
          return (
            <button
              key={q.value}
              className={optionButtonClass(isActive)}
              onClick={() => {
                onQualityChange(q.value);
                setCurrentMenu('main');
              }}
            >
              {q.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSpeedMenu = () => (
    <div className="space-y-0.5">
      <button
        className={backButtonClass}
        onClick={() => setCurrentMenu('main')}
      >
        <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
        <span>Velocidade</span>
      </button>
      <div className="mt-1 space-y-0.5">
        {speeds.map((s) => (
          <button
            key={s.value}
            className={optionButtonClass(playbackSpeed === s.value)}
            onClick={() => {
              onPlaybackSpeedChange(s.value);
              setCurrentMenu('main');
            }}
          >
            {s.value === 1 ? 'Normal' : `${s.value}x`}
          </button>
        ))}
      </div>
    </div>
  );

  const renderSubtitlesMenu = () => (
    <div className="space-y-0.5">
      <button
        className={backButtonClass}
        onClick={() => setCurrentMenu('main')}
      >
        <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
        <span>Legendas</span>
      </button>
      <div className="mt-1 space-y-0.5">
        {subtitles.length === 1 ? (
          <div className="px-3 py-2 text-xs md:text-sm text-white/60">
            Nenhuma legenda disponível
          </div>
        ) : (
          subtitles.map((sub) => (
            <button
              key={sub.id}
              className={optionButtonClass(currentSubtitle === sub.id)}
              onClick={() => {
                onSubtitleChange(sub.id);
                setCurrentMenu('main');
              }}
            >
              {sub.label}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="absolute right-8 md:right-12 bottom-16 md:bottom-20 w-40 md:w-48 bg-black/90 backdrop-blur-sm rounded-lg p-1.5 md:p-2">
      {currentMenu === 'main' && renderMainMenu()}
      {currentMenu === 'quality' && renderQualityMenu()}
      {currentMenu === 'speed' && renderSpeedMenu()}
      {currentMenu === 'subtitles' && renderSubtitlesMenu()}
    </div>
  );
}