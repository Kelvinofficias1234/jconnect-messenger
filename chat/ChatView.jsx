import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MoreVertical, Phone, Video, Search, BellOff, Bell, Trash2, UserCircle, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { enqueueMessage, initOutbox } from '@/lib/offlineOutbox';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import ContactInfoPanel from './ContactInfoPanel';
import { Megaphone } from 'lucide-react';
import { useCall } from './CallProvider';
import { formatRelativeTime, formatDateDivider, getDateKey } from '@/lib/timeFormat';
import { getConversationKey, decryptText, isEncrypted } from '@/lib/e2ee';

const CHAT_BG_STYLE = {
  background: 'linear-gradient(160deg, #0d0f1e 0%, #12103a 50%, #0d0f1e 100%)',
};

export default function ChatView({ conversation, currentUserId, otherProfile, profilesMap, chatBackground, readReceiptsEnabled, onBack, onDeleted }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const { startCall } = useCall();
  const [showMenu, setShowMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`muted_${conversation.id}`) || 'false'); } catch { return false; }
  });
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const typingTimeout = useRef(null);
  const bottomRef = useRef(null);
  const menuRef = useRef(null);

  const myProfile = profilesMap?.[currentUserId];
  const iBlockedOther = (myProfile?.blocked_ids || []).includes(otherProfile?.user_id);
  const otherBlockedMe = (otherProfile?.blocked_ids || []).includes(currentUserId);
  const isBlocked = iBlockedOther || otherBlockedMe;

  const handleTyping = () => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setIsTyping(false), 2000);
  };

  const loadMessages = async () => {
    const msgs = await base44.entities.Message.filter(
      { conversation_id: conversation.id },
      'created_date',
      200
    );
    const convKey = await getConversationKey(conversation, currentUserId, profilesMap);
    const decryptedMsgs = convKey
      ? await Promise.all(msgs.map(async m =>
          isEncrypted(m.text) ? { ...m, text: await decryptText(m.text, convKey) } : m
        ))
      : msgs;
    setMessages(decryptedMsgs);
    setLoading(false);
    // Always mark incoming messages as read when the chat is opened —
    // this clears the unread badge regardless of read-receipt settings.
    const unread = msgs.filter(m => m.sender_id !== currentUserId && !m.is_read);
    for (const m of unread) {
      base44.entities.Message.update(m.id, { is_read: true });
    }
    // Auto-expire unopened View Once messages after 14 days
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const expired = msgs.filter(m =>
      m.is_view_once && !m.view_once_opened && !m.deleted_for_everyone &&
      new Date(m.created_date).getTime() < fourteenDaysAgo
    );
    for (const m of expired) {
      try { await base44.entities.Message.update(m.id, { deleted_for_everyone: true }); } catch {}
    }
  };

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    loadMessages();
    const unsub = base44.entities.Message.subscribe(async (event) => {
      if (event.data?.conversation_id !== conversation.id) return;
      if (event.type === 'create') {
        let msg = event.data;
        if (isEncrypted(msg.text)) {
          const k = await getConversationKey(conversation, currentUserId, profilesMap);
          if (k) { try { msg = { ...msg, text: await decryptText(msg.text, k) }; } catch {} }
        }
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Always mark incoming messages as read when the chat is open —
        // clears the unread badge regardless of read-receipt settings.
        if (msg.sender_id !== currentUserId) {
          base44.entities.Message.update(msg.id, { is_read: true });
        }
      } else if (event.type === 'update') {
        let msg = event.data;
        if (isEncrypted(msg.text)) {
          const k = await getConversationKey(conversation, currentUserId, profilesMap);
          if (k) { try { msg = { ...msg, text: await decryptText(msg.text, k) }; } catch {} }
        }
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
      } else if (event.type === 'delete') {
        setMessages(prev => prev.filter(m => m.id !== event.data.id));
      }
    });
    return () => unsub();
  }, [conversation.id]);

  useEffect(() => {
    const cleanup = initOutbox(async (item) => {
      const { id, tempId, conversationId, attempts, createdAt, priority, ...createData } = item;
      const created = await base44.entities.Message.create(createData);
      const lastText = createData.message_type === 'poll' ? '📊 Poll'
        : createData.message_type === 'location' ? '📍 Location'
        : createData.message_type === 'event' ? '📅 Event'
        : createData.is_view_once ? '👁 View Once'
        : createData.file_url
          ? (createData.file_type === 'image' ? '📷 Photo'
            : createData.file_type === 'video' ? '🎥 Video'
            : createData.file_type === 'audio' ? '🎤 Voice message'
            : '📎 File')
          : createData.text;
      try {
        await base44.entities.Conversation.update(createData.conversation_id, {
          last_message_text: lastText,
          last_message_time: new Date().toISOString(),
          last_message_sender_id: createData.sender_id
        });
      } catch {}
      return created;
    });
    return cleanup;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSend = async (data) => {
    const messageData = {
      conversation_id: conversation.id,
      sender_id: currentUserId,
      text: data.text || '',
      file_url: data.file_url || '',
      file_name: data.file_name || '',
      file_type: data.file_type || '',
      message_type: data.message_type || 'text',
      poll_data: data.poll_data || '',
      location_lat: data.location_lat || null,
      location_lng: data.location_lng || null,
      location_label: data.location_label || '',
      is_live_location: data.is_live_location || false,
      live_expires_at: data.live_expires_at || '',
      event_data: data.event_data || '',
      reply_to_id: replyTo?.id || '',
      is_view_once: data.is_view_once || false
    };

    // Offline-first: queue if no connection, auto-sends when back online
    if (!navigator.onLine) {
      enqueueMessage(messageData, async (item) => {
        const { id, tempId, conversationId, attempts, createdAt, priority, ...createData } = item;
        return await base44.entities.Message.create(createData);
      });
      setReplyTo(null);
      return;
    }

    const created = await base44.entities.Message.create(messageData);
    setMessages(prev => {
      if (prev.find(m => m.id === created.id)) return prev;
      return [...prev, { ...created, text: data.text || '' }];
    });
    const lastText = data.message_type === 'poll' ? '📊 Poll'
      : data.message_type === 'location' ? (data.is_live_location ? '📍 Live Location' : '📍 Location')
      : data.message_type === 'event' ? '📅 Event'
      : data.is_view_once ? '👁 View Once'
      : data.file_url
        ? (data.file_type === 'image' ? '📷 Photo'
          : data.file_type === 'video' ? '🎥 Video'
          : data.file_type === 'audio' ? '🎤 Voice message'
          : '📎 File')
        : (data.text || '');
          await base44.entities.Conversation.update(conversation.id, {
      last_message_text: lastText,
      last_message_time: new Date().toISOString(),
      last_message_sender_id: currentUserId
    });
    setReplyTo(null);
  };

  const handleEditMessage = async (messageId, newText) => {
    await base44.entities.Message.update(messageId, {
      text: newText,
      edited_at: new Date().toISOString()
    });
    setEditingMessage(null);
  };

  const handleReact = async (message, nextReactions) => {
    await base44.entities.Message.update(message.id, { reactions: nextReactions });
  };

  const handleDeleteMessage = async (message) => {
    if (!confirm('Delete this message for everyone?')) return;
    await base44.entities.Message.update(message.id, {
      deleted_for_everyone: true
    });
  };

  const handleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem(`muted_${conversation.id}`, JSON.stringify(next));
    setShowContactInfo(false);
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this conversation? Messages are preserved for safety review.')) return;
    const currentHidden = conversation.hidden_for || [];
    if (currentHidden.includes(currentUserId)) return;
    await base44.entities.Conversation.update(conversation.id, {
      hidden_for: [...currentHidden, currentUserId]
    });
    setShowContactInfo(false);
    onDeleted?.();
    onBack?.();
  };

  const otherName = (conversation.type === 'group' || conversation.type === 'channel')
    ? (conversation.name || (conversation.type === 'channel' ? 'Channel' : 'Group'))
    : (otherProfile?.display_name || 'Chat');

  const statusText = otherProfile?.is_online
    ? 'online'
    : otherProfile?.last_seen
      ? `last seen ${formatRelativeTime(otherProfile.last_seen)}`
      : '';

  const isChannel = conversation.type === 'channel';
  const isGroup = conversation.type === 'group';
  const isAdmin = conversation.admin_ids?.includes(currentUserId);
  const channelCanPost = !isChannel || isAdmin;

  let bgStyle = CHAT_BG_STYLE;
  if (chatBackground && chatBackground !== 'default') {
    bgStyle = chatBackground.startsWith('http') || chatBackground.startsWith('/')
      ? { backgroundImage: `url(${chatBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: chatBackground };
  }

  const displayMessages = searchQuery
    ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const grouped = [];
  let lastDate = null;
  displayMessages.forEach(msg => {
    const d = getDateKey(msg.created_date);
    if (d !== lastDate) {
      grouped.push({ type: 'divider', date: msg.created_date, key: `d-${d}` });
      lastDate = d;
    }
    grouped.push({ type: 'msg', msg, key: msg.id });
  });

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 shrink-0 border-b border-white/5" style={{ backgroundColor: '#13152a' }}>
        <button onClick={onBack} className="flex items-center gap-2 p-2.5 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft size={28} />
          <span className="text-sm font-semibold hidden sm:inline">Chats</span>
        </button>
        <button onClick={() => setShowContactInfo(true)} className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
          <Avatar src={otherProfile?.avatar_url} name={otherName} size="sm" isOnline={otherProfile?.is_online} />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-white truncate flex items-center gap-1.5">
              {isChannel && <Megaphone size={13} className="text-purple-400 shrink-0" />}
              {otherName}
              {conversation.type === 'direct' && otherProfile?.is_meta_verified && <VerifiedBadge size={13} />}
              {isMuted && <BellOff size={12} className="text-white/30 shrink-0" />}
            </h3>
            {(isGroup || isChannel) ? (
              <p className="text-xs text-purple-400 truncate">
                {conversation.participant_ids?.length || 0} members{isChannel ? ' · channel' : ''}
              </p>
            ) : statusText ? (
              <p className="text-xs text-purple-400 truncate">{statusText}</p>
            ) : null}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {conversation.type === 'direct' && (
            <>
              <button onClick={() => otherProfile?.user_id && startCall(otherProfile.user_id, 'video')}
                className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                <Video size={20} />
              </button>
              <button onClick={() => otherProfile?.user_id && startCall(otherProfile.user_id, 'voice')}
                className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                <Phone size={20} />
              </button>
            </>
          )}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(p => !p)}
              className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors">
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                style={{ backgroundColor: '#1e2140' }}>
                <button onClick={() => { setShowContactInfo(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/8 transition-colors text-left">
                  <UserCircle size={16} className="text-purple-400" /> Contact Info
                </button>
                <button onClick={() => { setShowSearch(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/8 transition-colors text-left">
                  <Search size={16} className="text-purple-400" /> Search Messages
                </button>
                <button onClick={handleMute}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/8 transition-colors text-left">
                  {isMuted ? <Bell size={16} className="text-purple-400" /> : <BellOff size={16} className="text-purple-400" />}
                  {isMuted ? 'Unmute' : 'Mute notifications'}
                </button>
                <div className="border-t border-white/8" />
                <button onClick={handleDelete}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/8 transition-colors text-left">
                  <Trash2 size={16} /> Delete Conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-3 py-2 border-b border-white/5 shrink-0" style={{ backgroundColor: '#13152a' }}>
          <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border border-white/10" style={{ backgroundColor: '#1e2140' }}>
            <Search size={16} className="text-white/40" />
            <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none" />
            {searchQuery && (
              <span className="text-xs text-white/40">{displayMessages.length} found</span>
            )}
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}
              className="text-white/40 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-2" style={bgStyle}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : searchQuery && displayMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white/10 backdrop-blur-sm text-white/70 text-xs px-4 py-2 rounded-full border border-white/10">
              No messages found for "{searchQuery}"
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white/10 backdrop-blur-sm text-white/70 text-xs px-4 py-2 rounded-full border border-white/10">
              No messages yet. Say hi! 👋
            </div>
          </div>
        ) : (
          grouped.map(item =>
            item.type === 'divider' ? (
              <div key={item.key} className="flex justify-center my-3">
                <span className="bg-white/10 backdrop-blur-sm text-white/60 text-[11px] px-3 py-1 rounded-full border border-white/10 font-medium">
                  {formatDateDivider(item.date)}
                </span>
              </div>
            ) : (
              <MessageBubble
                key={item.key}
                message={item.msg}
                isOwn={item.msg.sender_id === currentUserId}
                senderName={
                  conversation.type === 'group' && item.msg.sender_id !== currentUserId
                    ? profilesMap?.[item.msg.sender_id]?.display_name
                    : null
                }
                profilesMap={profilesMap}
                repliedMessage={item.msg.reply_to_id ? messages.find(m => m.id === item.msg.reply_to_id) : null}
                currentUserId={currentUserId}
                onReact={handleReact}
                onReply={(msg) => setReplyTo(msg)}
                onEdit={(msg) => setEditingMessage(msg)}
                onDelete={handleDeleteMessage}
              />
            )
          )
        )}
        {otherProfile?.is_online && isTyping && (
          <TypingIndicator name={otherProfile?.display_name?.split(' ')[0] || 'them'} />
        )}
        <div ref={bottomRef} />
      </div>

      {channelCanPost ? (
        <ChatInput
          onSend={handleSend}
          onTyping={handleTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editingMessage={editingMessage}
          onEdit={handleEditMessage}
          onCancelEdit={() => setEditingMessage(null)}
          profilesMap={profilesMap}
          blocked={isBlocked}
        />
      ) : (
        <div className="shrink-0 px-4 py-3 border-t border-white/5 text-center" style={{ backgroundColor: '#13152a' }}>
          <p className="text-sm text-white/40">Only admins can post in this channel</p>
        </div>
      )}

      {showContactInfo && (
        <ContactInfoPanel
          profile={otherProfile}
          conversation={conversation}
          currentUserId={currentUserId}
          profilesMap={profilesMap}
          isMuted={isMuted}
          onClose={() => setShowContactInfo(false)}
          onMute={handleMute}
          onDelete={handleDelete}
          onUpdated={onBack}
        />
      )}
    </div>
  );
}