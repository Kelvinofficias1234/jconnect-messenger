import React, { useState, useEffect } from 'react';
import { AtSign, Check, X, Loader, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';

export default function UsernameSection({ profile, onSaved }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | available | taken | invalid
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const hasUsername = !!profile?.username;

  useEffect(() => {
    if (hasUsername && !isEditing) return;
    if (!username.trim()) { setStatus('idle'); return; }
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) { setStatus('invalid'); return; }
    setStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const results = await base44.entities.Profile.filter({ username: username.toLowerCase() });
        const isTaken = results.some(p => p.user_id !== profile?.user_id);
        setStatus(isTaken ? 'taken' : 'available');
      } catch { setStatus('idle'); }
    }, 400);
    return () => clearTimeout(timer);
  }, [username, hasUsername, isEditing, profile?.user_id]);

  const handleSave = async () => {
    if (status !== 'available') return;
    setSaving(true);
    try {
      await base44.entities.Profile.update(profile.id, { username: username.toLowerCase() });
      toast({ title: 'Username saved!', description: `@${username} is now yours.`, duration: 10000 });
      setIsEditing(false);
      setUsername('');
      onSaved?.();
    } catch (e) {
      toast({ title: 'Could not save', description: e?.message || 'Try again.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleEdit = () => {
    setUsername(profile?.username || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setUsername('');
    setStatus('idle');
  };

  // Already has a username and not editing — display it with edit option
  if (hasUsername && !isEditing) {
    return (
      <div className="rounded-2xl border border-purple-500/20 p-4 space-y-2"
        style={{ backgroundColor: 'rgba(124,58,237,0.06)' }}>
        <div className="flex items-center gap-2">
          <AtSign size={16} className="text-purple-400" />
          <p className="text-sm font-semibold text-white/70">Username</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-purple-300">@{profile.username}</span>
          <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">Reserved</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/30">Others can find and chat with you using @{profile.username}</p>
          <button onClick={handleEdit}
            className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors shrink-0 ml-2">
            <Pencil size={12} /> Edit
          </button>
        </div>
      </div>
    );
  }

  // Reservation / Edit form
  return (
    <div className="rounded-2xl border border-white/8 p-4 space-y-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center gap-2">
        <AtSign size={16} className="text-white/50" />
        <p className="text-sm font-semibold text-white/70">
          {isEditing ? 'Edit Username (@)' : 'Username (@)'}
        </p>
      </div>
      <p className="text-xs text-white/40 leading-relaxed">
        Find &amp; Reserve a Username (@). Search and reserve your custom @username handle
        to connect, chat, and trade without ever having to share your personal phone number.
      </p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">@</span>
          <input
            value={username}
            onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            placeholder="your_name"
            maxLength={32}
            className="w-full pl-8 pr-10 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none border border-white/10"
            style={{ backgroundColor: '#1e2140' }}
          />
          {status === 'checking' && <Loader size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 animate-spin" />}
          {status === 'available' && <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />}
          {(status === 'taken' || status === 'invalid') && <X size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />}
        </div>
        <button
          onClick={handleSave}
          disabled={status !== 'available' || saving}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
          {saving ? '...' : isEditing ? 'Save' : 'Reserve'}
        </button>
      </div>
      {isEditing && (
        <button onClick={handleCancelEdit}
          className="text-xs text-white/40 hover:text-white/60 transition-colors">
          Cancel
        </button>
      )}
      {status === 'available' && <p className="text-xs text-green-400">@{username} is available!</p>}
      {status === 'taken' && (
        <p className="text-xs text-red-400">
          This username is already taken. Please try adding numbers or underscores (e.g., @{username}_11 or @{username}11).
        </p>
      )}
      {status === 'invalid' && <p className="text-xs text-red-400">3-32 characters · letters, numbers &amp; underscores only</p>}
      {status === 'idle' && <p className="text-xs text-white/30">3-32 characters · letters, numbers &amp; underscores only</p>}
    </div>
  );
}