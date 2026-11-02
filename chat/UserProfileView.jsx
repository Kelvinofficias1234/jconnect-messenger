import React from 'react';
import { X } from 'lucide-react';
import Avatar from './Avatar';
import moment from 'moment';

export default function UserProfileView({ profile, onClose }) {
  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="relative h-28 bg-gradient-to-br from-primary/80 to-emerald-400/80">
          <button onClick={onClose} className="absolute top-3 right-3 text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex justify-center mb-4">
            <div className="border-4 border-card rounded-full">
              <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" isOnline={profile.is_online} />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-heading font-bold text-lg">{profile.display_name}</h3>
            {profile.status_message && (
              <p className="text-sm text-muted-foreground">{profile.status_message}</p>
            )}
            {profile.bio && (
              <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
            )}
            <p className={`text-xs ${profile.is_online ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
              {profile.is_online ? '● Online' : profile.last_seen ? `Last seen ${moment(profile.last_seen).fromNow()}` : 'Offline'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}