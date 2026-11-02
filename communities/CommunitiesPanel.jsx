import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import CommunitiesTab from './CommunitiesTab';
import CommunityDetail from './CommunityDetail';
import CreateCommunityModal from './CreateCommunityModal';
import ExploreCommunities from './ExploreCommunities';

export default function CommunitiesPanel({ currentUserId, allProfiles, onBack, onOpenChat }) {
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showExplore, setShowExplore] = useState(false);

  if (activeCommunity) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1025' }}>
        <CommunityDetail
          community={activeCommunity}
          currentUserId={currentUserId}
          allProfiles={allProfiles}
          onBack={() => setActiveCommunity(null)}
          onOpenChat={onOpenChat}
        />
        {showCreate && <CreateCommunityModal currentUserId={currentUserId} onCreated={(c) => { setShowCreate(false); setActiveCommunity(c); }} onClose={() => setShowCreate(false)} />}
        {showExplore && <ExploreCommunities currentUserId={currentUserId} onOpenCommunity={(c) => { setShowExplore(false); setActiveCommunity(c); }} onBack={() => setShowExplore(false)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1025' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0" style={{ backgroundColor: '#13152a' }}>
        <button onClick={onBack} className="p-2 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-semibold text-white flex-1">Communities</h2>
      </div>
      <CommunitiesTab
        currentUserId={currentUserId}
        onOpenCommunity={(c) => setActiveCommunity(c)}
        onExplore={() => setShowExplore(true)}
        onCreate={() => setShowCreate(true)}
      />
      {showCreate && <CreateCommunityModal currentUserId={currentUserId} onCreated={(c) => { setShowCreate(false); setActiveCommunity(c); }} onClose={() => setShowCreate(false)} />}
      {showExplore && <ExploreCommunities currentUserId={currentUserId} onOpenCommunity={(c) => { setShowExplore(false); setActiveCommunity(c); }} onBack={() => setShowExplore(false)} />}
    </div>
  );
}