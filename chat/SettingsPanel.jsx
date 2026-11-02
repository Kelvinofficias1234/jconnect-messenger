import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, LogOut, Palette, Bell, BellOff, Monitor, Shield, Share2, Copy, Check, Info, Sparkles, Siren, Music, Play, Pause, CheckCheck, BadgeCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import LinkedDevicesPanel from './LinkedDevicesPanel';
import AssistantChat from './AssistantChat';
import EmergencyPanel from './EmergencyPanel';
import GetVerifiedModal from './GetVerifiedModal';
import BackupStatusCard from './BackupStatusCard';
import UsernameSection from './UsernameSection';
import CommunitiesPanel from '@/components/communities/CommunitiesPanel';
import { previewRingtone, stopRingtone, RINGTONES, NOTIFICATIONS, previewNotification, saveRingtonePreference, saveNotifPreference } from '@/lib/ringtonePlayer';
import { APP_THEME_OPTIONS, DEFAULT_APP_BG } from '@/lib/appThemes';
import { toast } from '@/components/ui/use-toast';

const BG_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Midnight', value: '#0a0e27' },
  { label: 'Deep Purple', value: '#1a0b2e' },
  { label: 'Charcoal', value: '#1a1a2e' },
  { label: 'Dark Teal', value: '#0d1f1f' },
  { label: 'Navy', value: '#0d1b2a' },
  { label: 'Plum', value: '#1f0d28' },
  { label: 'Forest', value: '#0d1f15' },
  { label: 'Slate', value: '#1e2130' },
];

export default function SettingsPanel({ profile, allProfiles, onOpenChat, onBack, onUpdate }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [statusMsg, setStatusMsg] = useState(profile?.status_message || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [chatBg, setChatBg] = useState(profile?.chat_background || 'default');
  const [appBg, setAppBg] = useState(profile?.app_background || DEFAULT_APP_BG);
  const [notif, setNotif] = useState(profile?.notifications_enabled !== false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showCommunities, setShowCommunities] = useState(false);
  const [showVerified, setShowVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ringtone, setRingtone] = useState(profile?.ringtone || 'j_connect_call');
  const [playingRt, setPlayingRt] = useState(null);
  const [readReceipts, setReadReceipts] = useState(profile?.read_receipts_enabled !== false);
  const [notifSound, setNotifSound] = useState(profile?.notification_sound || 'nt_pulse');
  const [playingNotif, setPlayingNotif] = useState(null);

  useEffect(() => {
    return () => stopRingtone();
  }, []);

  if (showDevices) {
    return <LinkedDevicesPanel onBack={() => setShowDevices(false)} />;
  }

  if (showAssistant) {
    return <AssistantChat onClose={() => setShowAssistant(false)} />;
  }

  if (showCommunities) {
    return <CommunitiesPanel currentUserId={profile?.user_id} allProfiles={allProfiles} onBack={() => setShowCommunities(false)} onOpenChat={onOpenChat} />;
  }

  if (showEmergency) {
    return <EmergencyPanel currentUserId={profile?.user_id} currentProfile={profile} onBack={() => setShowEmergency(false)} onProfileUpdated={onUpdate} />;
  }

  if (showVerified) {
    return <GetVerifiedModal profile={profile} onClose={() => setShowVerified(false)} onSuccess={() => { setShowVerified(false); onUpdate(); }} />;
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAvatarUrl(file_url);
    setUploading(false);
  };

  const applyBackground = async (value) => {
    setChatBg(value);
    try { await base44.entities.Profile.update(profile.id, { chat_background: value }); } catch {}
  };

  const applyAppBg = async (value) => {
    setAppBg(value);
    try { await base44.entities.Profile.update(profile.id, { app_background: value }); } catch {}
  };

  const applyRingtone = async (value) => {
    setRingtone(value);
    saveRingtonePreference(value);
    try { await base44.entities.Profile.update(profile.id, { ringtone: value }); } catch {}
  };

  const applyNotifSound = async (value) => {
    setNotifSound(value);
    saveNotifPreference(value);
    try { await base44.entities.Profile.update(profile.id, { notification_sound: value }); } catch {}
  };

  const handlePreviewRingtone = (rtId) => {
    if (playingRt === rtId) { stopRingtone(); setPlayingRt(null); }
    else { previewRingtone(rtId); setPlayingRt(rtId); setTimeout(() => setPlayingRt(null), 6000); }
  };

  const handleSave = async () => {
    setSaving(true);
    stopRingtone();
    try {
      await base44.entities.Profile.update(profile.id, {
        display_name: displayName.trim(),
        bio: bio.trim(),
        status_message: statusMsg.trim(),
        avatar_url: avatarUrl,
        chat_background: chatBg,
        app_background: appBg,
        ringtone: ringtone,
        notification_sound: notifSound,
        notifications_enabled: notif,
        read_receipts_enabled: readReceipts
      });
      toast({ title: 'Settings saved', description: 'Your background, ringtone & profile have been updated.', duration: 10000 });
    } catch (e) {
      toast({ title: 'Save failed', description: e?.message || 'Could not save settings. Try again.', variant: 'destructive' });
    }
    setSaving(false);
    onUpdate();
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/register`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: appBg }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0" style={{ backgroundColor: '#13152a' }}>
        <button onClick={onBack} className="p-2.5 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={26} />
        </button>
        <h2 className="font-semibold text-white flex-1">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
        {/* Avatar */}
        <div className="flex justify-center">
          <label className="relative cursor-pointer group">
            <Avatar src={avatarUrl} name={displayName} size="xl" />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </label>
        </div>

        {/* Profile Fields */}
        <div className="rounded-2xl border border-white/8 p-4 space-y-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Profile</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">Display Name</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">Status Message</label>
            <Input value={statusMsg} onChange={e => setStatusMsg(e.target.value)}
              placeholder="Hey there! I am using J-Connect"
              className="rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">Bio</label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              className="rounded-xl resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
        </div>

        {/* Username */}
        <UsernameSection profile={profile} onSaved={onUpdate} />

        {/* Meta Verified */}
        <button
          onClick={() => setShowVerified(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-blue-500/30 hover:bg-blue-500/10 transition-colors"
          style={{ backgroundColor: profile?.is_meta_verified ? 'rgba(24,119,242,0.12)' : 'rgba(24,119,242,0.06)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#1877F2' }}>
            <BadgeCheck size={18} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
              {profile?.is_meta_verified ? 'Meta Verified Active' : 'Get Meta Verified'}
              {profile?.is_meta_verified && <BadgeCheck size={14} className="text-[#1877F2]" />}
            </p>
            <p className="text-xs text-white/40">
              {profile?.verified_tier && profile?.verified_tier !== 'none'
                ? `${profile.verified_tier === 'max' ? 'Business Max' : profile.verified_tier === 'premium' ? 'Business Premium' : 'Business Plus'} · ${profile.subscription_status === 'free' ? 'Granted free' : '$' + (profile.subscription_amount || 0) + '/mo'}`
                : 'Badge · broadcasts · support · from $15.49/mo'}
            </p>
          </div>
          <ArrowLeft size={16} className="text-blue-400/50 rotate-180" />
        </button>

        {/* Auto Backup */}
        <BackupStatusCard profile={profile} onUpdate={onUpdate} />

        {/* Linked Devices */}
        <button onClick={() => setShowDevices(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/8 hover:bg-white/5 transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <Monitor size={18} className="text-purple-400" />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Linked Devices</p>
            <p className="text-xs text-white/40">Use J-Connect on other devices</p>
          </div>
          <ArrowLeft size={16} className="text-white/30 rotate-180" />
        </button>

        {/* Communities */}
        <button onClick={() => setShowCommunities(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/8 hover:bg-white/5 transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <Users size={18} className="text-purple-400" />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Communities</p>
            <p className="text-xs text-white/40">Explore, create & manage your communities</p>
          </div>
          <ArrowLeft size={16} className="text-white/30 rotate-180" />
        </button>

        {/* Chat Background */}
        <div className="rounded-2xl border border-white/8 p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-white/50" />
            <p className="text-sm font-semibold text-white/70">Chat Background</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {BG_OPTIONS.map(opt => {
              const selected = chatBg === opt.value;
              const dark = opt.value.startsWith('#1') || opt.value.startsWith('#0');
              return (
                <button key={opt.value} onClick={() => applyBackground(opt.value)}
                  className="relative h-14 rounded-xl border-2 transition-all overflow-hidden"
                  style={{
                    backgroundColor: opt.value === 'default' ? 'hsl(var(--background))' : opt.value,
                    borderColor: selected ? '#B258FF' : 'rgba(255,255,255,0.1)',
                    transform: selected ? 'scale(1.05)' : 'scale(1)'
                  }}>
                  {selected && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#B258FF' }}>
                      <Check size={12} className="text-white" />
                    </span>
                  )}
                  <span className="text-[10px] font-medium" style={{ color: dark ? '#fff' : '#333' }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-white/30">Tap to apply instantly to your chats</p>
        </div>

        {/* App Background */}
        <div className="rounded-2xl border border-white/8 p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-white/50" />
            <p className="text-sm font-semibold text-white/70">App Background</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {APP_THEME_OPTIONS.map(opt => {
              const selected = appBg === opt.value;
              return (
                <button key={opt.value} onClick={() => applyAppBg(opt.value)}
                  className="relative h-12 rounded-xl border-2 transition-all overflow-hidden flex items-center px-3"
                  style={{
                    backgroundColor: opt.value,
                    borderColor: selected ? '#B258FF' : 'rgba(255,255,255,0.1)',
                    transform: selected ? 'scale(1.03)' : 'scale(1)'
                  }}>
                  {selected && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#B258FF' }}>
                      <Check size={12} className="text-white" />
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-white/90 truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-white/30">Global theme — chat screens stay isolated for readability</p>
        </div>

        {/* Ringtone */}
        <div className="rounded-2xl border border-white/8 p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-2">
            <Music size={16} className="text-white/50" />
            <p className="text-sm font-semibold text-white/70">Call Ringtone</p>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hide">
            {RINGTONES.map(rt => {
              const selected = ringtone === rt.id;
              const isPlaying = playingRt === rt.id;
              return (
                <div key={rt.id} className="flex items-center gap-2 rounded-xl transition-colors"
                  style={{ backgroundColor: selected ? 'rgba(124,58,237,0.1)' : 'transparent' }}>
                  <button onClick={() => handlePreviewRingtone(rt.id)}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
                    style={{ backgroundColor: isPlaying ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)' }}>
                    {isPlaying ? <Pause size={14} className="text-purple-400" /> : <Play size={14} className="text-white/60" />}
                  </button>
                  <button onClick={() => { applyRingtone(rt.id); handlePreviewRingtone(rt.id); }}
                    className="flex-1 text-left flex items-center justify-between py-2.5">
                    <span className={`text-sm ${selected ? 'text-purple-400 font-semibold' : 'text-white/70'}`}>{rt.name}</span>
                    {selected && <Check size={16} className="text-purple-400" />}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-white/30">Tap play to preview · tap name to set as your ringtone</p>
        </div>

        {/* Notification Sound */}
        <div className="rounded-2xl border border-white/8 p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-white/50" />
            <p className="text-sm font-semibold text-white/70">Notification Sound</p>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hide">
            {NOTIFICATIONS.map(nt => {
              const selected = notifSound === nt.id;
              const isPlaying = playingNotif === nt.id;
              return (
                <div key={nt.id} className="flex items-center gap-2 rounded-xl transition-colors"
                  style={{ backgroundColor: selected ? 'rgba(124,58,237,0.1)' : 'transparent' }}>
                  <button onClick={() => { if (playingNotif === nt.id) { setPlayingNotif(null); } else { previewNotification(nt.id); setPlayingNotif(nt.id); setTimeout(() => setPlayingNotif(null), 3000); } }}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
                    style={{ backgroundColor: isPlaying ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)' }}>
                    {isPlaying ? <Pause size={14} className="text-purple-400" /> : <Play size={14} className="text-white/60" />}
                  </button>
                  <button onClick={() => { applyNotifSound(nt.id); previewNotification(nt.id); }}
                    className="flex-1 text-left flex items-center justify-between py-2.5">
                    <span className={`text-sm ${selected ? 'text-purple-400 font-semibold' : 'text-white/70'}`}>{nt.name}</span>
                    {selected && <Check size={16} className="text-purple-400" />}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-white/30">Plays when you receive a new message</p>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-white/8"
          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-2">
            {notif ? <Bell size={16} className="text-purple-400" /> : <BellOff size={16} className="text-white/40" />}
            <span className="text-sm font-medium text-white/80">Notifications</span>
          </div>
          <Switch checked={notif} onCheckedChange={setNotif} />
        </div>

        {/* Read Receipts */}
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-white/8"
          style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-2">
            <CheckCheck size={16} className="text-purple-400" />
            <div>
              <p className="text-sm font-medium text-white/80">Read Receipts</p>
              <p className="text-xs text-white/30">Turn off to hide blue ticks</p>
            </div>
          </div>
          <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
        </div>

        {/* Invite Friends */}
        <div className="rounded-2xl border border-white/8 p-4 space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-white/50" />
            <p className="text-sm font-semibold text-white/70">Invite Friends</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 border border-white/10" style={{ backgroundColor: '#1e2140' }}>
            <span className="flex-1 text-xs text-white/40 truncate">{window.location.origin}/register</span>
            <button onClick={handleCopyInvite}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
        </div>

        {/* J-Connect Assistant */}
        <button
          onClick={() => setShowAssistant(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-purple-500/20 hover:bg-purple-500/10 transition-colors"
          style={{ backgroundColor: 'rgba(124,58,237,0.08)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-purple-300">J-Connect Assistant</p>
            <p className="text-xs text-white/40">Ask about features or request a tour with the Founder</p>
          </div>
          <ArrowLeft size={16} className="text-purple-400/50 rotate-180" />
        </button>

        {/* Emergency */}
        <button
          onClick={() => setShowEmergency(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-red-500/20 hover:bg-red-500/10 transition-colors"
          style={{ backgroundColor: 'rgba(239,68,68,0.05)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
            <Siren size={18} className="text-red-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-red-300">Emergency</p>
            <p className="text-xs text-white/40">Police, ambulance & fire · based on your location</p>
          </div>
          <ArrowLeft size={16} className="text-red-400/50 rotate-180" />
        </button>

        <Button onClick={handleSave} className="w-full rounded-2xl h-11 font-semibold" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>

        <Button variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-2xl"
          onClick={() => base44.auth.logout('/')}>
          <LogOut size={16} className="mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}