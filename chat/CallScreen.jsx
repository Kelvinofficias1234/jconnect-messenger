import React, { useEffect, useState, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import Avatar from './Avatar';
import VideoPlayer from './VideoPlayer';

export default function CallScreen({ call, status, localStream, remoteStream, hasRemoteVideo, otherProfile, onEnd }) {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const audioRef = useRef(null);

  const isVideo = call.callType === 'video';

  // Voice call: bind remote audio stream (video calls use memoized VideoPlayer)
  useEffect(() => {
    if (!isVideo && audioRef.current && remoteStream && audioRef.current.srcObject !== remoteStream) {
      const el = audioRef.current;
      el.srcObject = remoteStream;
      el.muted = false;
      const p = el.play();
      if (p) p.catch(() => {
        // Autoplay policy blocked unmuted playback — retry muted, then unmute on success
        el.muted = true;
        el.play().then(() => { el.muted = false; }).catch(() => {});
      });
    }
  }, [remoteStream, isVideo]);

  useEffect(() => {
    if (status !== 'connected') return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStream?.getAudioTracks().forEach(t => { t.enabled = !next; });
  };

  const toggleCam = () => {
    const next = !camOff;
    setCamOff(next);
    localStream?.getVideoTracks().forEach(t => { t.enabled = !next; });
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const statusText = status === 'connected' ? fmt(seconds) : status === 'ringing' ? 'Ringing…' : status === 'calling' ? 'Calling…' : 'Connecting…';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'linear-gradient(160deg,#0d0b1e 0%,#1a0b2e 50%,#0d0b1e 100%)' }}>
      {isVideo ? (
        <div className="flex-1 relative bg-black">
          <VideoPlayer stream={remoteStream} className="w-full h-full object-cover" />
          {!hasRemoteVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 pointer-events-none">
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-purple-500/40"
                style={{ boxShadow: '0 0 50px rgba(155,48,255,0.35)' }}>
                <Avatar src={otherProfile?.avatar_url} name={otherProfile?.display_name} size="xl" />
              </div>
              <p className="text-white/70 text-sm font-medium">{status === 'connected' ? 'Waiting for video…' : statusText}</p>
            </div>
          )}
          <div className="absolute top-20 right-4 w-28 h-40 rounded-2xl overflow-hidden border border-white/20 shadow-xl bg-black/40">
            <VideoPlayer stream={localStream} className="w-full h-full object-cover" muted />
          </div>
          <div className="absolute top-6 left-0 right-0 text-center">
            <p className="text-white font-semibold text-lg drop-shadow-lg">{otherProfile?.display_name || 'Call'}</p>
            <p className="text-white/80 text-sm drop-shadow">{statusText}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <Avatar src={otherProfile?.avatar_url} name={otherProfile?.display_name} size="xl" />
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">{otherProfile?.display_name || 'Call'}</h2>
            <p className="text-sm text-white/60 mt-2">{statusText}</p>
          </div>
          <audio ref={audioRef} autoPlay playsInline muted={false} />
        </div>
      )}

      <div className="pb-12 pt-4 flex items-center justify-center gap-6">
        <button onClick={toggleMute}
          className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
          {muted ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
        </button>
        {isVideo && (
          <button onClick={toggleCam}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
            {camOff ? <VideoOff size={24} className="text-white" /> : <Video size={24} className="text-white" />}
          </button>
        )}
        <button onClick={onEnd}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-900/50">
          <PhoneOff size={28} className="text-white" />
        </button>
      </div>
    </div>
  );
}