import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

export const VoicePlayer = ({ url, isMine }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  // Sync play/pause from actual audio events — not optimistic state flips
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('play',  onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('play',  onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  const onTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const onLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;

    // WebM duration fix: some browsers report Infinity for webm
    if (!isFinite(audio.duration) || audio.duration === 0) {
      audio.currentTime = 1e101;
      const fixDuration = () => {
        audio.removeEventListener('timeupdate', fixDuration);
        audio.currentTime = 0;
        setDuration(audio.duration);
      };
      audio.addEventListener('timeupdate', fixDuration);
    } else {
      setDuration(audio.duration);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => console.error('Audio playback error:', e));
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl min-w-[240px] shadow-sm ${isMine ? 'bg-primary/20 text-primary-dark' : 'bg-surface-lowest text-primary'}`}>
      <button
        onClick={togglePlay}
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${isMine ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}
      >
        {isPlaying
          ? <Pause size={24} fill="currentColor" />
          : <Play  size={24} fill="currentColor" className="ml-1" />}
      </button>

      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Click-to-seek scrubber */}
        <div
          className="h-2 bg-black/10 rounded-full overflow-hidden cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onLoadedMetadata={onLoadedMetadata}
        preload="metadata"
      />
    </div>
  );
};
