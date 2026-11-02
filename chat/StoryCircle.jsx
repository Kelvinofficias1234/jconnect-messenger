import React from 'react';
import Avatar from './Avatar';

export default function StoryCircle({ profile, hasStory, isOwn, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 min-w-[64px]">
      <div className={`p-0.5 rounded-full ${hasStory ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-white/10'}`}>
        <div className="p-0.5 rounded-full" style={{ backgroundColor: '#0f1120' }}>
          <Avatar
            src={profile?.avatar_url}
            name={profile?.display_name || ''}
            size="md"
          />
        </div>
      </div>
      <span className="text-[11px] text-white/50 truncate max-w-[64px]">
        {isOwn ? 'Your Story' : (profile?.display_name || '').split(' ')[0]}
      </span>
    </button>
  );
}