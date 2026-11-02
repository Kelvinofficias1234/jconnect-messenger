import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

export default function VoiceMessagePlayer({ src, isOwn }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1.0; // Max native volume — recording-side 3x gain handles the loud boost

    // webm/opus streams often report duration=Infinity because they lack a
    // duration header. Seek to the end to force the browser to compute it,
    // then seek back to 0 so playback starts from the beginning.
    const fixInfinityDuration = () => {
      const dur = audio.duration;
      if (!isFinite(dur)) {
        audio.currentTime = 1e101;
        const onSeeked = () => {
          audio.removeEventListener('seeked', onSeeked);
          const d = audio.duration;
          setDuration(isFinite(d) ? d : 0);
          audio.currentTime = 0;
        };
        audio.addEventListener('seeked', onSeeked);
      } else {
        setDuration(dur);
      }
    };

    const onMeta = () => fixInfinityDuration();
    const onDurChange = () => {
      const d = audio.duration;
      if (isFinite(d)) setDuration(d);
    };
    const onTime = () => setCurrent(audio.currentTime || 0);
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onDurChange);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onDurChange);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().catch(() => {}); setPlaying(true); }
  };

  const fmt = (s) => {
    if (!s || isNaN(s) || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const bars = 28;
  const playedBars = Math.floor((progress / 100) * bars);

  // Generate pseudo-random waveform heights (deterministic per src)
  const heights = Array.from({ length: bars }, (_, i) => {
    const seed = (src || '').charCodeAt(i % (src?.length || 1)) || i;
    return 30 + (Math.sin(seed * 1.7) * 35 + Math.cos(seed * 0.8) * 25 + 60);
  });

  return (
    <div className="flex items-center gap-3 py-1 min-w-[210px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle}
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95"
        style={{ backgroundColor: isOwn ? 'rgba(255,255,255,0.18)' : 'rgba(124,58,237,0.35)' }}>
        {playing ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" fill="white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[2px] h-8">
          {heights.map((h, i) => (
            <div key={i}
              className="flex-1 rounded-full transition-colors duration-150"
              style={{
                height: `${Math.min(h, 100)}%`,
                backgroundColor: i < playedBars
                  ? (isOwn ? 'rgba(255,255,255,0.95)' : '#c4b5fd')
                  : (isOwn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.22)')
              }} />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-white/50">{playing ? fmt(current) : fmt(duration)}</span>
          <span className="text-[10px] text-white/50">{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}