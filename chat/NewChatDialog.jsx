import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft, UserPlus, AtSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import AddByPhoneDialog from './AddByPhoneDialog';
import { loadMyContacts } from '@/lib/contactManager';

export default function NewChatDialog({ currentUserId, onSelect, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [usernameQuery, setUsernameQuery] = useState('');
  const [usernameResult, setUsernameResult] = useState(null);
  const [searchingUsername, setSearchingUsername] = useState(false);

  // Load contacts from Contact entity on mount — renders instantly
  useEffect(() => {
    loadContacts();
  }, [currentUserId]);

  const loadContacts = async () => {
    setLoading(true);
    const profs = await loadMyContacts(currentUserId);
    setContacts(profs);
    setLoading(false);
  };

  // Username search — exact match only, submitted on Enter (no auto-populate).
  // Prevents enumeration: a user can only confirm a handle exists by typing the
  // FULL exact username and pressing Enter. No partial/wildcard matching.
  const handleUsernameSearch = async () => {
    // Strip only a leading @ symbol — preserve @ inside email addresses
    const q = usernameQuery.trim().replace(/^@+/, '').trim();
    if (!q) { setUsernameResult(null); return; }
    setSearchingUsername(true);
    try {
      const qLower = q.toLowerCase();
      // Search across username + phone_number (Profile) and email (User) in parallel.
      // All queries are best-effort — non-admin email lookups may return empty.
      const [byUsername, byPhone, byEmail] = await Promise.all([
        base44.entities.Profile.filter({ username: qLower }).catch(() => []),
        base44.entities.Profile.filter({ phone_number: q }).catch(() => []),
        base44.entities.User.filter({ email: qLower }).catch(() => [])
      ]);

      // Username match (case-insensitive — query is lowercased)
      let match = byUsername.find(p => p.user_id !== currentUserId) || null;
      // Phone match
      if (!match) match = byPhone.find(p => p.user_id !== currentUserId) || null;
      // Email match — User entity returns User records; fetch the matching Profile
      if (!match && byEmail.length > 0) {
        const emailUser = byEmail.find(u => u.id !== currentUserId);
        if (emailUser) {
          const profs = await base44.entities.Profile.filter({ user_id: emailUser.id }).catch(() => []);
          match = profs.find(p => p.user_id !== currentUserId) || null;
        }
      }

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

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md flex flex-col overflow-hidden shadow-2xl border border-purple-900/40"
        style={{ backgroundColor: '#120024', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
          <button onClick={onClose} className="p-2.5 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={26} />
          </button>
          <h3 className="font-semibold text-white text-base flex-1">New Chat</h3>
          <button onClick={() => setShowAddPhone(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'rgba(155,48,255,0.15)' }}
            title="Add by phone number">
            <UserPlus size={18} className="text-purple-400" />
          </button>
        </div>

        {/* Username search */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="relative">
            <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              value={usernameQuery}
              onChange={e => { setUsernameQuery(e.target.value); setUsernameResult(null); }}
              onKeyDown={e => { if (e.key === 'Enter') handleUsernameSearch(); }}
              placeholder="Enter exact @username, email, or phone..."
              className="w-full pl-9 pr-10 py-2 rounded-full text-sm text-white placeholder:text-white/35 focus:outline-none border border-purple-900/40"
              style={{ backgroundColor: '#1A0B2E' }}
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
              onClick={() => onSelect(usernameResult)}
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
            </button>
          )}
          {usernameResult === 'not_found' && usernameQuery && (
            <p className="text-xs text-white/30 text-center py-2">No user found with @{usernameQuery.replace('@', '')}</p>
          )}
        </div>

        {/* Contact search */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-9 pr-4 py-2 rounded-full text-sm text-white placeholder:text-white/35 focus:outline-none border border-purple-900/40"
              style={{ backgroundColor: '#1A0B2E' }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3" />
              <p className="text-sm text-white/50">Loading contacts…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(155,48,255,0.12)' }}>
                <UserPlus size={28} className="text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">No contacts yet</p>
              <p className="text-xs text-white/40 mb-6 max-w-[260px]">
                {search ? 'No contacts match your search.' : 'Search by @username or add by phone number to start chatting.'}
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#B3A5C8' }}>
                  {search ? 'Search Results' : `${filtered.length} Contact${filtered.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              {filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-white/5"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1A0B2E'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Avatar src={p.avatar_url} name={p.display_name} size="md" isOnline={p.is_online} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white truncate">{p.display_name}</p>
                      {p.is_meta_verified && <VerifiedBadge size={13} />}
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#B3A5C8' }}>
                      {p.username ? `@${p.username}` : (p.status_message || 'Hey there! I am using J-Connect.')}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {showAddPhone && (
          <AddByPhoneDialog
            currentUserId={currentUserId}
            onSelect={(p) => { setShowAddPhone(false); onSelect(p); }}
            onClose={() => setShowAddPhone(false)}
          />
        )}
      </div>
    </div>
  );
}