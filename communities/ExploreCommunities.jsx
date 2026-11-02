import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users, Hash, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Avatar from '@/components/chat/Avatar';
import { toast } from '@/components/ui/use-toast';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'tech', label: 'Tech' },
  { value: 'education', label: 'Education' },
  { value: 'business', label: 'Business' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports' },
];

export default function ExploreCommunities({ currentUserId, onOpenCommunity, onBack }) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const all = await base44.entities.Community.list('-created_date', 200);
        setCommunities(all.filter(c => c.is_public));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleJoin = async (c) => {
    if (c.member_ids?.includes(currentUserId)) { onOpenCommunity(c); return; }
    try {
      const updated = await base44.entities.Community.update(c.id, {
        member_ids: [...(c.member_ids || []), currentUserId]
      });
      toast({ title: 'Joined!', description: `You're now a member of ${c.name}`, duration: 10000 });
      onOpenCommunity(updated);
    } catch (e) {
      toast({ title: 'Could not join', description: e?.message || 'Try again.', variant: 'destructive' });
    }
  };

  const filtered = communities.filter(c => {
    if (category !== 'all' && c.category !== category) return false;
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase()) && !c.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1025' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0" style={{ backgroundColor: '#13152a' }}>
        <button onClick={onBack} className="p-2 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-semibold text-white flex-1">Explore Communities</h2>
      </div>

      <div className="p-3 space-y-3 shrink-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search communities..."
            className="w-full pl-9 pr-4 py-2 rounded-full text-sm text-white placeholder:text-white/35 focus:outline-none border border-white/10"
            style={{ backgroundColor: '#1e2140' }} />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setCategory(cat.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === cat.value ? 'text-white' : 'text-white/50 border border-white/10'}`}
              style={category === cat.value ? { background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' } : {}}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(124,58,237,0.12)' }}>
              <Users size={28} className="text-purple-600/70" />
            </div>
            <p className="text-white/60 font-semibold">No communities found</p>
            <p className="text-white/30 text-sm">Try a different search or category</p>
          </div>
        ) : (
          filtered.map(c => {
            const joined = c.member_ids?.includes(currentUserId);
            return (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl border border-white/8"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <Avatar src={c.icon_url} name={c.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                    {c.name}
                    {c.is_public ? <Hash size={11} className="text-purple-400" /> : <Lock size={11} className="text-white/30" />}
                  </p>
                  <p className="text-xs text-white/40 truncate">{c.member_ids?.length || 0} members · {c.category || 'general'}</p>
                  {c.description && <p className="text-xs text-white/30 truncate mt-0.5">{c.description}</p>}
                </div>
                <button onClick={() => handleJoin(c)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${joined ? 'text-white/50 border border-white/10' : 'text-white'}`}
                  style={!joined ? { background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' } : {}}>
                  {joined ? 'Open' : 'Join'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}