import React, { useState, useEffect } from 'react';
import { Users, Plus, Compass, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Avatar from '@/components/chat/Avatar';

export default function CommunitiesTab({ currentUserId, onOpenCommunity, onExplore, onCreate }) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadCommunities = async () => {
    try {
      const all = await base44.entities.Community.list('-created_date', 200);
      setCommunities(all.filter(c => c.member_ids?.includes(currentUserId)));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadCommunities();
    const unsub = base44.entities.Community.subscribe(() => loadCommunities());
    return () => unsub();
  }, [currentUserId]);

  const filtered = communities.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="flex gap-2 p-3">
        <button onClick={onExplore}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
          <Compass size={16} /> Explore
        </button>
        <button onClick={onCreate}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white/80 border border-white/10 hover:bg-white/5 transition-colors"
          style={{ backgroundColor: '#1e2140' }}>
          <Plus size={16} /> Create
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search your communities..."
            className="w-full pl-9 pr-4 py-2 rounded-full text-sm text-white placeholder:text-white/35 focus:outline-none border border-white/10"
            style={{ backgroundColor: '#1e2140' }} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(124,58,237,0.12)' }}>
            <Users size={36} className="text-purple-600/70" />
          </div>
          <p className="text-white/60 font-semibold mb-1">No communities yet</p>
          <p className="text-white/30 text-sm mb-4">Explore public communities or create your own</p>
          <button onClick={onExplore} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
            Explore Communities
          </button>
        </div>
      ) : (
        filtered.map(c => (
          <button key={c.id} onClick={() => onOpenCommunity(c)}
            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 transition-colors text-left">
            <Avatar src={c.icon_url} name={c.name} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{c.name}</p>
              <p className="text-xs text-white/40 truncate">
                {c.member_ids?.length || 0} members · {c.category || 'general'}
              </p>
            </div>
          </button>
        ))
      )}
    </div>
  );
}