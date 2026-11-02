import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Check, Users, Megaphone, AtSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { Button } from '@/components/ui/button';
import { getOrCreateKeyPair, generateGroupKey, encryptGroupKeyForMembers, storeConversationKey } from '@/lib/e2ee';
import { loadMyContacts } from '@/lib/contactManager';

export default function NewGroupDialog({ currentUserId, onCreated, onClose, defaultType = 'group' }) {
  const [step, setStep] = useState('select');
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState('');
  const [groupType, setGroupType] = useState(defaultType);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [usernameQuery, setUsernameQuery] = useState('');
  const [usernameResult, setUsernameResult] = useState(null);
  const [searchingUsername, setSearchingUsername] = useState(false);

  // Load contacts from the app's internal Contact entity on mount —
  // no native phonebook sync required, works on every browser.
  useEffect(() => {
    loadContacts();
  }, [currentUserId]);

  const loadContacts = async () => {
    setLoading(true);
    const profs = await loadMyContacts(currentUserId);
    setContacts(profs);
    setLoading(false);
  };

  // Exact @username search — same privacy model as New Chat dialog.
  // Only confirms a handle exists when the full exact username is typed.
  const handleUsernameSearch = async () => {
    const q = usernameQuery.toLowerCase().replace(/[@\s]/g, '');
    if (!q.trim()) { setUsernameResult(null); return; }
    setSearchingUsername(true);
    try {
      const results = await base44.entities.Profile.filter({ username: q });
      const match = results.find(p => p.user_id !== currentUserId) || null;
      if (match) {
        const isContact = contacts.some(c => c.user_id === match.user_id);
        setUsernameResult({ ...match, _isContact: isContact });
      } else {
        setUsernameResult('not_found');
      }
    } catch { setUsernameResult('not_found'); }
    setSearchingUsername(false);
  };

  const filtered = contacts.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.display_name?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q)
    );
  });

  const toggle = (profile) => {
    setSelected(prev =>
      prev.find(p => p.user_id === profile.user_id)
        ? prev.filter(p => p.user_id !== profile.user_id)
        : [...prev, profile]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      const memberIds = [currentUserId, ...selected.map(p => p.user_id)];
      const profMap = {};
      [...contacts, ...selected].forEach(p => { profMap[p.user_id] = p; });
      let encryptedKeys = '';
      let groupKeyRaw = null;
      try {
        const myKP = await getOrCreateKeyPair();
        const { raw } = await generateGroupKey();
        groupKeyRaw = raw;
        const encMap = await encryptGroupKeyForMembers(raw, memberIds, myKP, profMap, currentUserId);
        encryptedKeys = JSON.stringify(encMap);
      } catch {}
      const newConvo = await base44.entities.Conversation.create({
        type: groupType,
        name: name.trim(),
        participant_ids: memberIds,
        admin_ids: [currentUserId],
        last_message_text: '',
        last_message_time: new Date().toISOString(),
        encrypted_group_keys: encryptedKeys
      });
      if (groupKeyRaw) {
        await storeConversationKey(newConvo.id, groupKeyRaw);
      }
      setCreating(false);
      onCreated(newConvo);
    } catch (e) {
      setCreating(false);
    }
  };

  const title = step === 'select'
    ? (groupType === 'channel' ? 'New Channel' : 'New Group')
    : (groupType === 'channel' ? 'Channel Name' : 'Group Name');

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl border border-white/10"
        style={{ backgroundColor: '#13152a' }} onClick={e => e.stopPropagation()}>

        <div className="flex items-center gap-3 p-4 border-b border-white/5 shrink-0">
          <button onClick={step === 'name' ? () => setStep('select') : onClose} className="text-white/60 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h3 className="font-semibold text-white">{title}</h3>
            {step === 'select' && selected.length > 0 && (
              <p className="text-xs text-purple-400">{selected.length} selected</p>
            )}
          </div>
          {step === 'select' && selected.length > 0 && (
            <button onClick={() => setStep('name')}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-600 hover:bg-purple-500 transition-colors">
              <Check size={16} className="text-white" />
            </button>
          )}
        </div>

        {step === 'select' ? (
          <>
            {/* Type toggle */}
            <div className="flex gap-2 p-3 border-b border-white/5 shrink-0">
              <button onClick={() => setGroupType('group')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${groupType === 'group' ? 'text-white' : 'text-white/40'}`}
                style={groupType === 'group' ? { background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' } : { backgroundColor: '#1e2140' }}>
                <Users size={16} /> Group
              </button>
              <button onClick={() => setGroupType('channel')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${groupType === 'channel' ? 'text-white' : 'text-white/40'}`}
                style={groupType === 'channel' ? { background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' } : { backgroundColor: '#1e2140' }}>
                <Megaphone size={16} /> Channel
              </button>
            </div>
            <p className="px-4 py-2 text-xs text-white/40">
              {groupType === 'channel' ? 'Channels: only admins can post, members can view.' : 'Groups: everyone can send messages.'}
            </p>

            {selected.length > 0 && (
              <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide border-b border-white/5 shrink-0">
                {selected.map(p => (
                  <button key={p.user_id} onClick={() => toggle(p)}
                    className="flex items-center gap-1.5 bg-purple-600/30 border border-purple-500/40 rounded-full px-2.5 py-1 shrink-0">
                    <span className="text-xs text-purple-200">{p.display_name.split(' ')[0]}</span>
                    <span className="text-purple-400 text-xs">×</span>
                  </button>
                ))}
              </div>
            )}

            {/* Username search — exact match only */}
            <div className="px-4 py-3 border-b border-white/5 shrink-0">
              <div className="relative">
                <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  value={usernameQuery}
                  onChange={e => { setUsernameQuery(e.target.value); setUsernameResult(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleUsernameSearch(); }}
                  placeholder="Add by exact @username..."
                  className="w-full pl-9 pr-10 py-2 rounded-full text-sm text-white placeholder:text-white/35 focus:outline-none border border-white/10"
                  style={{ backgroundColor: '#1e2140' }}
                />
                <button onClick={handleUsernameSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-purple-400 hover:bg-white/10 transition-colors"
                  title="Search">
                  <Search size={16} />
                </button>
              </div>
              {searchingUsername && (
                <div className="flex justify-center py-2">
                  <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              )}
              {usernameResult && usernameResult !== 'not_found' && (
                <button
                  onClick={() => {
                    toggle(usernameResult);
                    setUsernameQuery('');
                    setUsernameResult(null);
                  }}
                  className="w-full flex items-center gap-3 px-2 py-2 mt-2 rounded-xl hover:bg-white/5 transition-colors">
                  {usernameResult._isContact ? (
                    <Avatar src={usernameResult.avatar_url} name={usernameResult.display_name} size="md" isOnline={usernameResult.is_online} />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}>
                      <AtSign size={18} className="text-purple-400" />
                    </div>
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{usernameResult.display_name}</p>
                    <p className="text-xs text-purple-400 truncate">@{usernameResult.username}</p>
                  </div>
                  {selected.find(s => s.user_id === usernameResult.user_id) ? (
                    <span className="text-xs text-purple-400">Added</span>
                  ) : (
                    <span className="text-xs text-white/40">Tap to add</span>
                  )}
                </button>
              )}
              {usernameResult === 'not_found' && usernameQuery && (
                <p className="text-xs text-white/30 text-center py-2">No user found with @{usernameQuery.replace('@', '')}</p>
              )}
            </div>

            {/* Contact search */}
            <div className="p-3 border-b border-white/5 shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-9 pr-4 py-1.5 rounded-full text-sm text-white placeholder:text-white/35 focus:outline-none border border-white/10"
                  style={{ backgroundColor: '#1e2140' }} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3" />
                  <p className="text-sm text-white/50">Loading contacts…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-white/40 text-sm">
                  {contacts.length === 0
                    ? 'No contacts yet. Add people by their @username above.'
                    : 'No contacts match your search.'}
                </div>
              ) : (
                filtered.map(p => {
                  const isSelected = !!selected.find(s => s.user_id === p.user_id);
                  return (
                    <button key={p.user_id} onClick={() => toggle(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5">
                      <Avatar src={p.avatar_url} name={p.display_name} size="md" isOnline={p.is_online} />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white truncate">{p.display_name}</p>
                          {p.is_meta_verified && <VerifiedBadge size={13} />}
                        </div>
                        <p className="text-xs text-white/40 truncate">{p.username ? `@${p.username}` : (p.status_message || p.bio || 'Available')}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-white/30'}`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col p-5 gap-5">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                {groupType === 'channel' ? <Megaphone size={32} className="text-white" /> : <Users size={32} className="text-white" />}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider mb-1.5 block">
                {groupType === 'channel' ? 'Channel Name' : 'Group Name'}
              </label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder={groupType === 'channel' ? 'Enter channel name...' : 'Enter group name...'}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/35 focus:outline-none border border-white/10"
                style={{ backgroundColor: '#1e2140' }} />
            </div>

            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Members ({selected.length + 1})</p>
              <div className="flex flex-wrap gap-2">
                {selected.map(p => (
                  <div key={p.user_id} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                    <Avatar src={p.avatar_url} name={p.display_name} size="xs" />
                    <span className="text-xs text-white/70">{p.display_name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleCreate} disabled={!name.trim() || creating}
              className="mt-auto rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold">
              {creating ? 'Creating...' : (groupType === 'channel' ? 'Create Channel' : 'Create Group')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}