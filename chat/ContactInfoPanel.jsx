import React, { useState } from 'react';
import { X, Phone, Video, Bell, BellOff, Trash2, UserX, Crown, UserPlus, Users, Megaphone, Ban, Unlock } from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { useCall } from './CallProvider';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { formatRelativeTime } from '@/lib/timeFormat';
import { loadMyContacts } from '@/lib/contactManager';

export default function ContactInfoPanel({ profile, conversation, currentUserId, profilesMap, onClose, onMute, onDelete, isMuted, onUpdated }) {
  const { startCall } = useCall();
  const [showAdd, setShowAdd] = useState(false);
  const [allProfiles, setAllProfiles] = useState(null);

  const myProfile = profilesMap?.[currentUserId];
  const [blocked, setBlocked] = useState((myProfile?.blocked_ids || []).includes(profile?.user_id));

  const handleBlock = async () => {
    if (!myProfile || !profile?.user_id) return;
    const current = myProfile.blocked_ids || [];
    const next = blocked
      ? current.filter(id => id !== profile.user_id)
      : [...current, profile.user_id];
    await base44.entities.Profile.update(myProfile.id, { blocked_ids: next });
    setBlocked(!blocked);
    onUpdated?.();
  };

  const isGroup = conversation?.type === 'group' || conversation?.type === 'channel';
  const isAdmin = conversation?.admin_ids?.includes(currentUserId);

  const loadAllProfiles = async () => {
    // Privacy: Load only the current user's contacts — never the global directory
    if (!allProfiles) setAllProfiles(await loadMyContacts(currentUserId));
  };

  const memberIds = conversation?.participant_ids || [];
  const members = memberIds.map(id => profilesMap?.[id]).filter(Boolean);

  const handleRemoveMember = async (userId) => {
    if (!isAdmin) return;
    const next = conversation.participant_ids.filter(id => id !== userId);
    const nextAdmins = (conversation.admin_ids || []).filter(id => id !== userId);
    await base44.entities.Conversation.update(conversation.id, { participant_ids: next, admin_ids: nextAdmins });
    onUpdated?.();
  };

  const handleToggleAdmin = async (userId) => {
    if (!isAdmin) return;
    const admins = conversation.admin_ids || [];
    const nextAdmins = admins.includes(userId) ? admins.filter(id => id !== userId) : [...admins, userId];
    await base44.entities.Conversation.update(conversation.id, { admin_ids: nextAdmins });
    onUpdated?.();
  };

  const handleAddMember = async (userId) => {
    if (!isAdmin) return;
    if (conversation.participant_ids.includes(userId)) return;
    const next = [...conversation.participant_ids, userId];
    await base44.entities.Conversation.update(conversation.id, { participant_ids: next });
    setShowAdd(false);
    onUpdated?.();
  };

  const availableToAdd = (allProfiles || []).filter(p =>
    !conversation.participant_ids.includes(p.user_id) && p.user_id !== currentUserId
  );

  // GROUP / CHANNEL VIEW
  if (isGroup) {
    const gname = conversation.name || (conversation.type === 'channel' ? 'Channel' : 'Group');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
        <div className="w-full max-w-sm rounded-3xl border border-white/10 overflow-hidden max-h-[85vh] flex flex-col"
          style={{ backgroundColor: '#13152a' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
            <span className="font-semibold text-white flex items-center gap-2">
              {conversation.type === 'channel' ? <Megaphone size={16} className="text-purple-400" /> : <Users size={16} className="text-purple-400" />}
              {conversation.type === 'channel' ? 'Channel Info' : 'Group Info'}
            </span>
            <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10"><X size={20} /></button>
          </div>

          <div className="flex flex-col items-center py-6 px-4 border-b border-white/5 shrink-0">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              {conversation.type === 'channel' ? <Megaphone size={32} className="text-white" /> : <Users size={32} className="text-white" />}
            </div>
            <h2 className="text-xl font-bold text-white mt-3">{gname}</h2>
            <p className="text-sm text-white/50 mt-1">{memberIds.length} members</p>
          </div>

          <div className="overflow-y-auto scrollbar-hide flex-1">
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Members</p>
              {isAdmin && (
                <button onClick={() => { setShowAdd(s => !s); loadAllProfiles(); }}
                  className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300">
                  <UserPlus size={14} /> Add
                </button>
              )}
            </div>

            {showAdd && (
              <div className="border-b border-white/5 max-h-48 overflow-y-auto scrollbar-hide">
                {availableToAdd.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-white/40">No more contacts to add.</p>
                ) : availableToAdd.map(p => (
                  <button key={p.user_id} onClick={() => handleAddMember(p.user_id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                    <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                    <span className="flex-1 text-sm text-white truncate">{p.display_name}</span>
                    <span className="text-xs font-semibold text-purple-400">Add</span>
                  </button>
                ))}
              </div>
            )}

            {members.map(p => {
              const memberIsAdmin = (conversation.admin_ids || []).includes(p.user_id);
              const isSelf = p.user_id === currentUserId;
              return (
                <div key={p.user_id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5">
                  <Avatar src={p?.avatar_url} name={p?.display_name || 'User'} size="sm" isOnline={p?.is_online} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-white truncate">{p?.display_name || 'Unknown'}</p>
                      {p?.is_meta_verified && <VerifiedBadge size={12} />}
                      {memberIsAdmin && <Crown size={12} className="text-yellow-400 shrink-0" />}
                      {isSelf && <span className="text-xs text-purple-400">you</span>}
                    </div>
                    <p className="text-xs text-white/35 truncate">{memberIsAdmin ? 'Admin' : 'Member'}</p>
                  </div>
                  {isAdmin && !isSelf && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggleAdmin(p.user_id)}
                        title={memberIsAdmin ? 'Remove admin' : 'Make admin'}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <Crown size={14} className={memberIsAdmin ? 'text-yellow-400' : 'text-white/30'} />
                      </button>
                      <button onClick={() => handleRemoveMember(p.user_id)}
                        title="Remove member"
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                        <UserX size={14} className="text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 shrink-0 border-t border-white/5">
            <button onClick={onDelete}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm hover:bg-red-500/10 transition-colors text-left">
              <Trash2 size={18} className="text-red-400" />
              <span className="text-red-400">Delete {conversation.type === 'channel' ? 'channel' : 'group'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DIRECT CHAT VIEW
  const name = profile?.display_name || 'Unknown';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-white/10 overflow-hidden"
        style={{ backgroundColor: '#13152a' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="font-semibold text-white">Contact Info</span>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10"><X size={20} /></button>
        </div>

        <div className="flex flex-col items-center py-8 px-4 border-b border-white/5">
          <Avatar src={profile?.avatar_url} name={name} size="xl" isOnline={profile?.is_online} />
          <div className="flex items-center gap-1.5 mt-4">
            <h2 className="text-xl font-bold text-white">{name}</h2>
            {profile?.is_meta_verified && <VerifiedBadge size={16} />}
          </div>
          {profile?.status_message && <p className="text-sm text-white/50 mt-1 text-center">{profile.status_message}</p>}
          <p className="text-xs text-purple-400 mt-2">
            {profile?.is_online ? 'Online now' : profile?.last_seen ? `Last seen ${formatRelativeTime(profile.last_seen)}` : 'Offline'}
          </p>
        </div>

        <div className="flex justify-around py-4 border-b border-white/5">
          {[
            { icon: Phone, label: 'Call', action: () => profile?.user_id && startCall(profile.user_id, 'voice') },
            { icon: Video, label: 'Video', action: () => profile?.user_id && startCall(profile.user_id, 'video') },
            { icon: isMuted ? Bell : BellOff, label: isMuted ? 'Unmute' : 'Mute', action: onMute },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action}
              className="flex flex-col items-center gap-1.5 px-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}>
                <Icon size={20} className="text-purple-400" />
              </div>
              <span className="text-xs text-white/50">{label}</span>
            </button>
          ))}
        </div>

        {profile?.bio && (
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-xs text-white/40 mb-1 font-medium uppercase tracking-widest">About</p>
            <p className="text-sm text-white/70">{profile.bio}</p>
          </div>
        )}

        <div className="p-3 space-y-1">
          <button onClick={onMute}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm hover:bg-white/5 transition-colors text-left">
            {isMuted ? <Bell size={18} className="text-white/50" /> : <BellOff size={18} className="text-white/50" />}
            <span className="text-white/70">{isMuted ? 'Unmute notifications' : 'Mute notifications'}</span>
          </button>
          <button onClick={handleBlock}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm hover:bg-red-500/10 transition-colors text-left">
            {blocked ? <Unlock size={18} className="text-white/50" /> : <Ban size={18} className="text-red-400" />}
            <span className={blocked ? 'text-white/70' : 'text-red-400'}>{blocked ? 'Unblock' : 'Block contact'}</span>
          </button>
          <button onClick={onDelete}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm hover:bg-red-500/10 transition-colors text-left">
            <Trash2 size={18} className="text-red-400" />
            <span className="text-red-400">Delete conversation</span>
          </button>
        </div>
      </div>
    </div>
  );
}