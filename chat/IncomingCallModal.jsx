import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import Avatar from './Avatar';

export default function IncomingCallModal({ incoming, profile, onAccept, onReject }) {
  const isVideo = incoming.callType === 'video';
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-6"
      style={{ background: 'rgba(13,11,30,0.95)', backdropFilter: 'blur(8px)' }}>
      <p className="text-xs text-white/60 uppercase tracking-widest font-semibold">
        Incoming {isVideo ? 'Video' : 'Voice'} Call
      </p>
      <div className="w-28 h-28 rounded-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#9b30ff,#6b21d6)', boxShadow: '0 0 50px rgba(155,48,255,0.4)' }}>
        <Avatar src={profile?.avatar_url} name={profile?.display_name} size="xl" />
      </div>
      <h2 className="text-2xl font-bold text-white">{profile?.display_name || 'Unknown'}</h2>
      <div className="flex items-center gap-10 mt-4">
        <button onClick={onReject}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-900/50">
          <PhoneOff size={26} className="text-white" />
        </button>
        <button onClick={onAccept}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-green-600 hover:bg-green-700 transition-colors shadow-lg shadow-green-900/50">
          {isVideo ? <Video size={26} className="text-white" /> : <Phone size={26} className="text-white" />}
        </button>
      </div>
    </div>
  );
}