import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StoryCircle from './StoryCircle';
import StoryViewer from './StoryViewer';
import CreateStory from './CreateStory';
import Avatar from './Avatar';

export default function StoriesBar({ currentUserId, currentProfile, allProfiles }) {
  const [stories, setStories] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);

  const loadStories = async () => {
    const now = new Date().toISOString();
    const all = await base44.entities.Story.list('-created_date', 200);
    // Filter to non-expired (24h)
    const valid = all.filter(s => {
      if (s.expires_at && s.expires_at < now) return false;
      const created = new Date(s.created_date);
      return (Date.now() - created.getTime()) < 24 * 60 * 60 * 1000;
    });
    setStories(valid);
  };

  useEffect(() => {
    loadStories();
  }, []);

  const groupedByUser = {};
  stories.forEach(s => {
    if (!groupedByUser[s.user_id]) groupedByUser[s.user_id] = [];
    groupedByUser[s.user_id].push(s);
  });

  const profileMap = {};
  allProfiles.forEach(p => { profileMap[p.user_id] = p; });

  const myStories = groupedByUser[currentUserId] || [];
  const otherUsers = Object.keys(groupedByUser).filter(id => id !== currentUserId);

  const handleViewed = async (storyId, userId) => {
    const story = stories.find(s => s.id === storyId);
    if (!story || story.viewed_by?.includes(userId)) return;
    const newViewed = [...(story.viewed_by || []), userId];
    await base44.entities.Story.update(storyId, { viewed_by: newViewed });
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-white/5" style={{ backgroundColor: '#0f1120' }}>
        {/* Add Story / My Story */}
        <button onClick={() => myStories.length > 0 ? setViewingUser(currentUserId) : setShowCreate(true)} className="flex flex-col items-center gap-1 min-w-[64px]">
          <div className="relative">
            <div className={`p-0.5 rounded-full ${myStories.length > 0 ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-transparent'}`}>
              <div className="p-0.5 rounded-full" style={{ backgroundColor: '#0f1120' }}>
                <Avatar src={currentProfile?.avatar_url} name={currentProfile?.display_name} size="md" />
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2"
              style={{ backgroundColor: '#7c3aed', borderColor: '#0f1120' }}
            >
              <Plus size={12} className="text-white" />
            </button>
          </div>
          <span className="text-[11px] text-white/40">Your Story</span>
        </button>

        {otherUsers.map(userId => (
          <StoryCircle
            key={userId}
            profile={profileMap[userId]}
            hasStory={true}
            onClick={() => setViewingUser(userId)}
          />
        ))}
      </div>

      {showCreate && (
        <CreateStory
          userId={currentUserId}
          onClose={() => setShowCreate(false)}
          onCreated={loadStories}
        />
      )}

      {viewingUser && groupedByUser[viewingUser] && (
        <StoryViewer
          stories={groupedByUser[viewingUser]}
          profile={profileMap[viewingUser] || currentProfile}
          currentUserId={currentUserId}
          onClose={() => setViewingUser(null)}
          onViewed={handleViewed}
        />
      )}
    </>
  );
}