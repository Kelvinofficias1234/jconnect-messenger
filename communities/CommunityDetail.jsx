import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Plus, Megaphone, Hash, Lock, Crown, Shield, LogOut, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Avatar from '@/components/chat/Avatar';
import { toast } from '@/components/ui/use-toast';

export default function CommunityDetail({ community, currentUserId, allProfiles, onBack, onOpenChat }) {
  const [comms, setComms] = useState(community);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('group');
  const [announceText, setAnnounceText] = useState('');
  const [sending, setSending] = useState(false);

  const isMember = comms.member_ids?.includes(currentUserId);
  const isOwner = comms.owner_id === currentUserId;
  const isAdmin = isOwner || comms.admin_ids?.includes(currentUserId);

  const loadData = async () => {
    try {
      const convs = await base44.entities.Conversation.filter({ community_id: comms.id }, '-created_date', 100);
      setConversations(convs);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Conversation.subscribe((event) => {
      if (event.data?.community_id === comms.id) loadData();
    });
    return () => unsub();
  }, [comms.id]);

  const handleJoin = async () => {
    const updated = await base44.entities.Community.update(comms.id, {
      member_ids: [...(comms.member_ids || []), currentUserId]
    });
    setComms(updated);
    toast({ title: 'Joined!', description: `You're now a member of ${comms.name}`, duration: 10000 });
  };

  const handleLeave = async () => {
    if (isOwner) { toast({ title: 'Owner cannot leave', description: 'Transfer ownership or delete the community', variant: 'destructive' }); return; }
    if (!confirm('Leave this community?')) return;
    await base44.entities.Community.update(comms.id, {
      member_ids: (comms.member_ids || []).filter(id => id !== currentUserId),
      admin_ids: (comms.admin_ids || []).filter(id => id !== currentUserId)
    });
    onBack();
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    await base44.entities.Conversation.create({
      type: newGroupType,
      name: newGroupName.trim(),
      participant_ids: comms.member_ids || [],
      admin_ids: [comms.owner_id, ...(comms.admin_ids || [])],
      community_id: comms.id,
      last_message_text: '',
      last_message_time: new Date().toISOString()
    });
    setNewGroupName('');
    setShowAddGroup(false);
    setNewGroupType('group');
    loadData();
    toast({ title: 'Created!', description: `${newGroupType === 'channel' ? 'Channel' : 'Sub-group'} added`, duration: 10000 });
  };

  const handleAnnounce = async () => {
    if (!announceText.trim()) return;
    setSending(true);
    const groups = conversations.filter(c => c.type === 'group' || c.type === 'channel');
    for (const g of groups) {
      try {
        await base44.entities.Message.create({
          conversation_id: g.id,
          sender_id: currentUserId,
          text: `📢 ${announceText.trim()}`
        });
        await base44.entities.Conversation.update(g.id, {
          last_message_text: `📢 ${announceText.trim()}`,
          last_message_time: new Date().toISOString(),
          last_message_sender_id: currentUserId
        });
      } catch {}
    }
    setAnnounceText('');
    setShowAnnounce(false);
    setSending(false);
    toast({ title: 'Announcement sent!', description: `Delivered to ${groups.length} ${groups.length === 1 ? 'group' : 'groups'}`, duration: 10000 });
  };

  const handleToggleAdmin = async (userId) => {
    const currentAdmins = comms.admin_ids || [];
    const newAdmins = currentAdmins.includes(userId)
      ? currentAdmins.filter(id => id !== userId)
      : [...currentAdmins, userId];
    const updated = await base44.entities.Community.update(comms.id, { admin_ids: newAdmins });
    setComms(updated);
  };

  const profilesMap = {};
  (allProfiles || []).forEach(p => { profilesMap[p.user_id] = p; });

  const groups = conversations.filter(c => c.type === 'group');
  const channels = conversations.filter(c => c.type === 'channel');

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1025' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0" style={{ backgroundColor: '#13152a' }}>
        <button onClick={onBack} className="p-2 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <Avatar src={comms.icon_url} name={comms.name} size="sm" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white truncate flex items-center gap-1.5">
            {comms.name}
            {comms.is_public ? <Hash size={12} className="text-purple-400" /> : <Lock size={12} className="text-white/30" />}
          </h2>
          <p className="text-xs text-white/40">{comms.member_ids?.length || 0} members · {comms.category || 'general'}</p>
        </div>
        {isMember && !isOwner && (
          <button onClick={handleLeave} className="p-2 text-white/50 hover:text-red-400 rounded-full hover:bg-white/10 transition-colors">
            <LogOut size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
        {comms.description && (
          <p className="text-sm text-white/60 leading-relaxed">{comms.description}</p>
        )}

        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowAddGroup(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white/80 border border-white/10 hover:bg-white/5 transition-colors"
              style={{ backgroundColor: '#1e2140' }}>
              <Plus size={14} /> Add Sub-Group
            </button>
            <button onClick={() => setShowAnnounce(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
              <Megaphone size={14} /> Announce
            </button>
          </div>
        )}

        {!isMember && (
          <button onClick={handleJoin}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
            Join Community
          </button>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Sub-Groups</p>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-white/30 py-2">No sub-groups yet{isAdmin ? ' — add one above' : ''}</p>
          ) : (
            groups.map(g => (
              <button key={g.id} onClick={() => onOpenChat(g)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/8 hover:bg-white/5 transition-colors text-left"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1e2140' }}>
                  <Users size={16} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{g.name}</p>
                  <p className="text-xs text-white/30 truncate">{g.participant_ids?.length || 0} members</p>
                </div>
              </button>
            ))
          )}
        </div>

        {channels.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Channels</p>
            {channels.map(ch => (
              <button key={ch.id} onClick={() => onOpenChat(ch)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/8 hover:bg-white/5 transition-colors text-left"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1e2140' }}>
                  <Megaphone size={16} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{ch.name}</p>
                  <p className="text-xs text-white/30 truncate">{ch.participant_ids?.length || 0} subscribers</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Members ({comms.member_ids?.length || 0})</p>
          {(comms.member_ids || []).map(uid => {
            const p = profilesMap[uid];
            const isUserOwner = uid === comms.owner_id;
            const isUserAdmin = comms.admin_ids?.includes(uid);
            return (
              <div key={uid} className="flex items-center gap-3 p-2 rounded-xl">
                <Avatar src={p?.avatar_url} name={p?.display_name || 'User'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                    {p?.display_name || 'Unknown user'}
                    {isUserOwner && <Crown size={12} className="text-yellow-400" />}
                    {isUserAdmin && !isUserOwner && <Shield size={12} className="text-purple-400" />}
                  </p>
                  {p?.username && <p className="text-xs text-white/30">@{p.username}</p>}
                </div>
                {isAdmin && !isUserOwner && (
                  <button onClick={() => handleToggleAdmin(uid)}
                    className="text-xs px-2 py-1 rounded-lg text-white/60 hover:text-purple-400 border border-white/10 transition-colors">
                    {isUserAdmin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showAddGroup && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setShowAddGroup(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={{ backgroundColor: '#1e2140' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-white">Add Sub-Group</h3>
            <div className="flex gap-2">
              <button onClick={() => setNewGroupType('group')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${newGroupType === 'group' ? 'text-white' : 'text-white/50 border border-white/10'}`}
                style={newGroupType === 'group' ? { background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' } : {}}>
                Group
              </button>
              <button onClick={() => setNewGroupType('channel')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${newGroupType === 'channel' ? 'text-white' : 'text-white/50 border border-white/10'}`}
                style={newGroupType === 'channel' ? { background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' } : {}}>
                Channel
              </button>
            </div>
            <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
              placeholder={newGroupType === 'channel' ? 'Channel name' : 'Group name'}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none border border-white/10"
              style={{ backgroundColor: '#0f1025' }} />
            <div className="flex gap-2">
              <button onClick={() => setShowAddGroup(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white/60 border border-white/10">Cancel</button>
              <button onClick={handleAddGroup} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showAnnounce && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setShowAnnounce(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={{ backgroundColor: '#1e2140' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-purple-400" />
              <h3 className="font-semibold text-white">Send Announcement</h3>
            </div>
            <p className="text-xs text-white/40">This message will be sent to all {conversations.length} sub-groups and channels in {comms.name}.</p>
            <textarea value={announceText} onChange={e => setAnnounceText(e.target.value)} rows={3}
              placeholder="Type your announcement..."
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none border border-white/10 resize-none"
              style={{ backgroundColor: '#0f1025' }} />
            <div className="flex gap-2">
              <button onClick={() => setShowAnnounce(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white/60 border border-white/10">Cancel</button>
              <button onClick={handleAnnounce} disabled={sending || !announceText.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
                <Send size={14} /> {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}