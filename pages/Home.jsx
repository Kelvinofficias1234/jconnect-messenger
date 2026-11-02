import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, MessageCircle, Settings, MessageSquarePlus, Users, Phone, Copy, Check as CheckIcon, PenSquare, CircleDot, Megaphone, Monitor, ShoppingBag } from 'lucide-react';
import CallsTab from '@/components/chat/CallsTab';
import LinkedDevicesPanel from '@/components/chat/LinkedDevicesPanel';
import useCurrentProfile from '@/hooks/useCurrentProfile';
import ProfileSetup from '@/pages/ProfileSetup';
import ConversationItem from '@/components/chat/ConversationItem';
import ChatView from '@/components/chat/ChatView';
import NewChatDialog from '@/components/chat/NewChatDialog';
import NewGroupDialog from '@/components/chat/NewGroupDialog';
import SettingsPanel from '@/components/chat/SettingsPanel';
import StatusTab from '@/components/chat/StatusTab';
import Avatar from '@/components/chat/Avatar';
import { playNotificationSound } from '@/lib/ringtonePlayer';
import { notifyChatMessage } from '@/lib/notificationManager';
import AppLogo from '@/components/AppLogo';
import { getAppBg } from '@/lib/appThemes';
import { getSavedNotif } from '@/lib/ringtonePlayer';
import BackupPrompt from '@/components/chat/BackupPrompt';
import useBackup from '@/hooks/useBackup';
import useE2EE from '@/hooks/useE2EE';
import { processPendingReferral, createMutualContacts } from '@/lib/contactManager';

export default function Home() {
  const { profile, user, loading, reload } = useCurrentProfile();
  const [conversations, setConversations] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [unreadMsgs, setUnreadMsgs] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [activeTab, setActiveTab] = useState('Chats');
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [convoLoading, setConvoLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [newGroupType, setNewGroupType] = useState('group');
  const activeConvoRef = useRef(null);
  const myConvoIdsRef = useRef(new Set());
  const loadDataInFlightRef = useRef(false);
  const lastLoadRef = useRef(0);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  useBackup(profile);
  useE2EE(user?.id, profile);
  const appBg = getAppBg(profile);

  const profilesMap = useMemo(() => {
    const map = {};
    allProfiles.forEach(p => { map[p.user_id] = p; });
    return map;
  }, [allProfiles]);

  const loadData = useCallback(async () => {
    if (!user) return;
    // Throttle: ensure at least 2s between API calls to prevent rate-limit errors
    // when multiple subscriptions and visibility/online events fire in quick succession.
    const now = Date.now();
    if (loadDataInFlightRef.current || (now - lastLoadRef.current < 2000)) return;
    lastLoadRef.current = now;
    loadDataInFlightRef.current = true;
    try {
      const convos = await base44.entities.Conversation.filter({ participant_ids: user.id }, '-last_message_time', 200);
      const myConvos = convos.filter(c => c.participant_ids?.includes(user.id) && !c.hidden_for?.includes(user.id));
      setConversations(myConvos);
      myConvoIdsRef.current = new Set(myConvos.map(c => c.id));
      // Fetch only profiles of conversation participants — no global directory
      const participantIds = new Set();
      myConvos.forEach(c => c.participant_ids?.forEach(id => participantIds.add(id)));
      const profs = participantIds.size > 0
        ? await base44.entities.Profile.filter({ user_id: { $in: [...participantIds] } })
        : [];
      setAllProfiles(profs);
      setConvoLoading(false);
      // Scope unread messages to the user's conversations only — fetching every
      // unread message system-wide triggers rate limits on active apps.
      const allMsgs = myConvos.length > 0
        ? await base44.entities.Message.filter({ is_read: false, conversation_id: { $in: myConvos.map(c => c.id) } }, '-created_date', 500)
        : [];
      setUnreadMsgs(allMsgs.filter(m => m.sender_id !== user.id));
    } finally {
      loadDataInFlightRef.current = false;
    }
  }, [user?.id]);

  // ── Auto-reconnection: re-establish subscriptions + reload data on network restore ──
  useEffect(() => {
    const handleOnline = () => loadData();
    const handleVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        loadData();
      }
    };
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [loadData]);

  useEffect(() => {
    if (!user || !profile) return;
    loadData();
    const unsubConvo = base44.entities.Conversation.subscribe((event) => {
      if (event.type === 'create') {
        loadData();
      } else if (event.type === 'update') {
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === event.data.id);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = event.data;
          updated.sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0));
          return updated;
        });
      }
    });
    const unsubMsg = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data?.sender_id !== user.id) {
        const inMyConvo = myConvoIdsRef.current.has(event.data?.conversation_id);
        const isActiveConvo = activeConvoRef.current?.id === event.data?.conversation_id;
        if (inMyConvo && !isActiveConvo) {
          setUnreadMsgs(prev => prev.find(m => m.id === event.data.id) ? prev : [...prev, event.data]);
        }
        if (inMyConvo && !isActiveConvo && profile?.notifications_enabled !== false) {
          playNotificationSound(profile?.notification_sound || getSavedNotif());
          // Native OS notification when the app is backgrounded
          const sender = profilesMap[event.data?.sender_id];
          notifyChatMessage(
            sender?.display_name || 'New message',
            event.data?.text || (event.data?.file_url ? '📎 Attachment' : 'You have a new message')
          );
        }
      } else if (event.type === 'update' && event.data?.is_read) {
        setUnreadMsgs(prev => prev.filter(m => m.id !== event.data.id));
      } else if (event.type === 'delete') {
        setUnreadMsgs(prev => prev.filter(m => m.id !== event.data.id));
      }
    });
    return () => { unsubConvo(); unsubMsg(); };
  }, [user?.id, profile?.id, loadData]);

  useEffect(() => {
    const targetConvoId = sessionStorage.getItem('open_convo');
    if (targetConvoId && conversations.length > 0) {
      const convo = conversations.find(c => c.id === targetConvoId);
      if (convo) setActiveConvo(convo);
      sessionStorage.removeItem('open_convo');
    }
  }, [conversations]);

  useEffect(() => { activeConvoRef.current = activeConvo; }, [activeConvo]);
  useEffect(() => { myConvoIdsRef.current = new Set(conversations.map(c => c.id)); }, [conversations]);

  useEffect(() => {
    if (profile && !profile.backup_consent_date) {
      setShowBackupPrompt(true);
    }
  }, [profile?.id, profile?.backup_consent_date]);

  // Process pending deep-link referral after profile is ready
  useEffect(() => {
    if (user?.id && profile?.id) {
      processPendingReferral(user.id, profile);
    }
  }, [user?.id, profile?.id]);

  const getUnreadCount = (convoId) => unreadMsgs.filter(m => m.conversation_id === convoId).length;
  const getOtherProfile = (convo) => {
    const otherId = convo.participant_ids?.find(id => id !== user?.id);
    return profilesMap[otherId];
  };

  const handleNewChat = async (targetProfile) => {
    setShowNewChat(false);
    const existing = conversations.find(c =>
      c.type === 'direct' &&
      c.participant_ids?.includes(targetProfile.user_id) &&
      c.participant_ids?.includes(user.id)
    );
    if (existing) { setActiveConvo(existing); return; }
    const newConvo = await base44.entities.Conversation.create({
      type: 'direct',
      participant_ids: [user.id, targetProfile.user_id],
      last_message_text: '',
      last_message_time: new Date().toISOString()
    });
    // Establish mutual contact relationship (deep-link or manual search)
    createMutualContacts(user.id, profile, targetProfile.user_id, targetProfile, 'search');
    await loadData();
    setActiveConvo(newConvo);
  };

  const handleBackupChoice = async (enabled) => {
    setShowBackupPrompt(false);
    try {
      await base44.entities.Profile.update(profile.id, {
        backup_enabled: enabled,
        backup_consent_date: new Date().toISOString()
      });
      reload();
    } catch (e) {}
  };

  const filteredConvos = conversations.filter(c => {
    if (!search) return true;
    const other = getOtherProfile(c);
    return other?.display_name?.toLowerCase().includes(search.toLowerCase())
      || c.name?.toLowerCase().includes(search.toLowerCase());
  });

  const totalUnread = unreadMsgs.length;

  const handleShareApp = () => {
    navigator.clipboard.writeText(`${window.location.origin}/register`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: appBg }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 0 40px rgba(155,48,255,0.4)' }}>
            <MessageCircle size={30} className="text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!profile) return <ProfileSetup user={user} onComplete={reload} />;

  // Active chat — full screen on mobile, panel on desktop
  if (activeConvo) {
    return (
      <div className="h-screen flex overflow-hidden" style={{ background: appBg }}>
        {/* Desktop sidebar */}
        <div className="hidden md:flex w-[320px] lg:w-[380px] flex-col shrink-0 border-r border-white/5">
          <MainPanel
            profile={profile} user={user} activeTab={activeTab} setActiveTab={setActiveTab}
            showSearch={showSearch} setShowSearch={setShowSearch} search={search} setSearch={setSearch}
            setShowNewChat={setShowNewChat} setShowNewGroup={setShowNewGroup} setNewGroupType={setNewGroupType}
            totalUnread={totalUnread} filteredConvos={filteredConvos} getOtherProfile={getOtherProfile}
            getUnreadCount={getUnreadCount} activeConvo={activeConvo} setActiveConvo={setActiveConvo}
            convoLoading={convoLoading} allProfiles={allProfiles}
          />
        </div>
        {/* Chat */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <ChatView
            conversation={activeConvo}
            currentUserId={user.id}
            otherProfile={getOtherProfile(activeConvo)}
            profilesMap={profilesMap}
            chatBackground={profile.chat_background}
            readReceiptsEnabled={profile?.read_receipts_enabled !== false}
            onBack={() => setActiveConvo(null)}
            onDeleted={() => setActiveConvo(null)}
          />
        </div>
        {showNewChat && <NewChatDialog currentUserId={user.id} onSelect={handleNewChat} onClose={() => setShowNewChat(false)} />}
        {showNewGroup && <NewGroupDialog currentUserId={user.id} defaultType={newGroupType} onCreated={(c) => { setShowNewGroup(false); loadData(); setActiveConvo(c); }} onClose={() => setShowNewGroup(false)} />}
        {showBackupPrompt && <BackupPrompt onEnable={() => handleBackupChoice(true)} onSkip={() => handleBackupChoice(false)} />}
      </div>
    );
  }

  // Settings — full screen
  if (activeTab === 'Settings') {
    return (
      <div className="h-screen flex overflow-hidden" style={{ background: appBg }}>
        <div className="hidden md:flex w-[320px] lg:w-[380px] flex-col shrink-0 border-r border-white/5">
          <MainPanel
            profile={profile} user={user} activeTab={activeTab} setActiveTab={setActiveTab}
            showSearch={showSearch} setShowSearch={setShowSearch} search={search} setSearch={setSearch}
            setShowNewChat={setShowNewChat} setShowNewGroup={setShowNewGroup} setNewGroupType={setNewGroupType}
            totalUnread={totalUnread} filteredConvos={filteredConvos} getOtherProfile={getOtherProfile}
            getUnreadCount={getUnreadCount} activeConvo={activeConvo} setActiveConvo={setActiveConvo}
            convoLoading={convoLoading} allProfiles={allProfiles}
          />
        </div>
        <div className="flex-1">
          <SettingsPanel profile={profile} allProfiles={allProfiles} onOpenChat={(convo) => { setActiveConvo(convo); setActiveTab('Chats'); }} onBack={() => { reload(); setActiveTab('Chats'); }} onUpdate={() => { reload(); setActiveTab('Chats'); }} />
        </div>
        {/* Mobile full screen settings */}
        <div className="md:hidden fixed inset-0 z-50" style={{ background: appBg }}>
          <SettingsPanel profile={profile} allProfiles={allProfiles} onOpenChat={(convo) => { setActiveConvo(convo); setActiveTab('Chats'); }} onBack={() => { reload(); setActiveTab('Chats'); }} onUpdate={() => { reload(); setActiveTab('Chats'); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: appBg }}>
      <div className="flex w-full md:w-[320px] lg:w-[380px] flex-col shrink-0 border-r border-white/5">
        <MainPanel
          profile={profile} user={user} activeTab={activeTab} setActiveTab={setActiveTab}
          showSearch={showSearch} setShowSearch={setShowSearch} search={search} setSearch={setSearch}
          setShowNewChat={setShowNewChat} setShowNewGroup={setShowNewGroup} setNewGroupType={setNewGroupType}
          totalUnread={totalUnread} filteredConvos={filteredConvos} getOtherProfile={getOtherProfile}
          getUnreadCount={getUnreadCount} activeConvo={activeConvo} setActiveConvo={setActiveConvo}
          convoLoading={convoLoading} allProfiles={allProfiles}
        />
      </div>

      {/* Desktop empty state */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8 relative"
        style={{ background: appBg }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, rgba(155,48,255,0.7) 0%, transparent 70%)' }} />
        </div>
        <div className="relative z-10 max-w-sm w-full">
          <div className="flex justify-center mb-6">
            <AppLogo size="xl" textClassName="text-3xl" />
          </div>
          <p className="text-sm text-white/40 max-w-xs leading-relaxed mx-auto">Select a conversation or start a new chat</p>
        </div>
      </div>

      {showNewChat && <NewChatDialog currentUserId={user.id} onSelect={handleNewChat} onClose={() => setShowNewChat(false)} />}
      {showNewGroup && <NewGroupDialog currentUserId={user.id} defaultType={newGroupType} onCreated={(c) => { setShowNewGroup(false); loadData(); setActiveConvo(c); }} onClose={() => setShowNewGroup(false)} />}
      {showBackupPrompt && <BackupPrompt onEnable={() => handleBackupChoice(true)} onSkip={() => handleBackupChoice(false)} />}
    </div>
  );
}

// ─── Main Panel with bottom tab bar ──────────────────────────────────────────
function MainPanel({ profile, user, activeTab, setActiveTab, showSearch, setShowSearch, search, setSearch,
  setShowNewChat, setShowNewGroup, setNewGroupType, totalUnread, filteredConvos, getOtherProfile, getUnreadCount,
  activeConvo, setActiveConvo, convoLoading, allProfiles }) {
  const profilesMap = useMemo(() => {
    const map = {};
    (allProfiles || []).forEach(p => { map[p.user_id] = p; });
    return map;
  }, [allProfiles]);
  const [showMenu, setShowMenu] = useState(false);
  const [showLinkedDevices, setShowLinkedDevices] = useState(false);

  if (showLinkedDevices) {
    return <LinkedDevicesPanel onBack={() => setShowLinkedDevices(false)} />;
  }

  const tabs = [
    { key: 'Chats', icon: MessageCircle, label: 'Chats' },
    { key: 'Status', icon: Phone, label: 'Status' },
    { key: 'Calls', icon: Phone, label: 'Calls' },
  ];

  return (
    <div className="flex flex-col h-full relative" style={{ backgroundColor: '#0f1025' }}>
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ backgroundColor: '#0f1025' }}>
        <AppLogo size="md" textClassName="text-xl tracking-wide" />
        <div className="flex items-center gap-1">
          <Link to="/marketplace" className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/8 transition-colors relative">
            <ShoppingBag size={20} />
          </Link>
          <button onClick={() => setShowSearch(s => !s)} className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/8 transition-colors">
            <Search size={20} />
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(s => !s)} className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/8 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 w-52 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                  style={{ backgroundColor: '#1e2140' }}>
                  <button onClick={() => { setNewGroupType('group'); setShowNewGroup(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/8 transition-colors text-left">
                    <Users size={16} className="text-purple-400" /> New Group
                  </button>
                  <button onClick={() => { setNewGroupType('channel'); setShowNewGroup(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/8 transition-colors text-left">
                    <Megaphone size={16} className="text-purple-400" /> New Channel
                  </button>
                  <button onClick={() => { setShowNewChat(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/8 transition-colors text-left">
                    <MessageSquarePlus size={16} className="text-purple-400" /> New Chat
                  </button>
                  <button onClick={() => { setShowLinkedDevices(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/8 transition-colors text-left">
                    <Monitor size={16} className="text-purple-400" /> Linked Devices
                  </button>
                  <div className="border-t border-white/8" />
                  <button onClick={() => { setActiveTab('Settings'); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/8 transition-colors text-left">
                    <Settings size={16} className="text-purple-400" /> Settings
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-3 pb-2" style={{ backgroundColor: '#0f1025' }}>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'Status' ? 'Search status by email or contact...' : 'Search conversations...'}
              className="w-full pl-9 pr-4 py-2 rounded-full text-sm text-white placeholder:text-white/35 focus:outline-none border border-white/10"
              style={{ backgroundColor: '#1e2140' }}
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'Chats' && (
          <ChatsTab
            currentUserId={user.id}
            filteredConvos={filteredConvos}
            getOtherProfile={getOtherProfile}
            getUnreadCount={getUnreadCount}
            activeConvo={activeConvo}
            setActiveConvo={setActiveConvo}
            convoLoading={convoLoading}
            search={search}
            setShowNewChat={setShowNewChat}
            profilesMap={profilesMap}
          />
        )}

        {activeTab === 'Status' && (
          <StatusTab
            currentUserId={user.id}
            currentProfile={profile}
            allProfiles={allProfiles || []}
            searchQuery={search}
          />
        )}

        {activeTab === 'Calls' && (
          <CallsTab currentUserId={user.id} allProfiles={allProfiles} />
        )}

        {activeTab === 'Settings' && null}
      </div>

      {/* FAB for new chat (Chats tab only) */}
      {activeTab === 'Chats' && (
        <div className="absolute bottom-20 right-4 z-20">
          <button
            onClick={() => setShowNewChat(true)}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 4px 20px rgba(155,48,255,0.5)' }}>
            <PenSquare size={24} className="text-white" />
          </button>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <div className="shrink-0 border-t border-white/8 flex items-center justify-around px-2 py-2"
        style={{ backgroundColor: '#0f1025' }}>
        {[
          { key: 'Chats', label: 'Chats' },
          { key: 'Status', label: 'Status' },
          { key: 'Calls', label: 'Calls' },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex flex-col items-center gap-1 flex-1 py-1 relative transition-colors">
              {tab.key === 'Chats' && totalUnread > 0 && (
                <span className="absolute top-0 right-1/4 translate-x-2 -translate-y-0.5 min-w-[16px] h-4 text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                  style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
              {tab.key === 'Chats' && <MessageCircle size={22} className={isActive ? 'text-purple-400' : 'text-white/35'} />}
              {tab.key === 'Status' && <CircleDot size={22} className={isActive ? 'text-purple-400' : 'text-white/35'} />}
              {tab.key === 'Calls' && <Phone size={22} className={isActive ? 'text-purple-400' : 'text-white/35'} />}
              <span className={`text-[11px] font-medium ${isActive ? 'text-purple-400' : 'text-white/35'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #9b30ff, #6b21d6)' }} />
              )}
            </button>
          );
        })}

        {/* Settings icon on right */}
        <button
          onClick={() => setActiveTab('Settings')}
          className="flex flex-col items-center gap-1 flex-1 py-1 relative transition-colors">
          <Settings size={22} className={activeTab === 'Settings' ? 'text-purple-400' : 'text-white/35'} />
          <span className={`text-[11px] font-medium ${activeTab === 'Settings' ? 'text-purple-400' : 'text-white/35'}`}>Settings</span>
          {activeTab === 'Settings' && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
              style={{ background: 'linear-gradient(90deg, #9b30ff, #6b21d6)' }} />
          )}
        </button>
      </div>
    </div>
  );
}

function ChatsTab({ currentUserId, filteredConvos, getOtherProfile, getUnreadCount, activeConvo, setActiveConvo, convoLoading, search, setShowNewChat, profilesMap }) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {convoLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filteredConvos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{ background: 'rgba(124,58,237,0.12)' }}>
            <MessageCircle size={36} className="text-purple-600/70" />
          </div>
          <p className="text-white/60 font-semibold text-base mb-1">
            {search ? 'No conversations found' : 'No conversations yet'}
          </p>
          <p className="text-white/30 text-sm mb-6">
            {search ? 'Try a different search' : 'Tap the pencil icon to start chatting'}
          </p>
        </div>
      ) : (
        filteredConvos.map(c => (
          <ConversationItem
            key={c.id}
            conversation={c}
            otherProfile={getOtherProfile(c)}
            unreadCount={getUnreadCount(c.id)}
            isActive={activeConvo?.id === c.id}
            currentUserId={currentUserId}
            onClick={() => setActiveConvo(c)}
            profilesMap={profilesMap}
          />
        ))
      )}
    </div>
  );
}