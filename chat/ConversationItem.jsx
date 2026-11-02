import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { formatConversationTime } from '@/lib/timeFormat';
import { Check, CheckCheck, Users, Megaphone } from 'lucide-react';
import { getConversationKey, decryptText, isEncrypted } from '@/lib/e2ee';

export default function ConversationItem({ conversation, otherProfile, unreadCount, isActive, onClick, currentUserId, profilesMap }) {
  const name = conversation.type === 'group'
    ? (conversation.name || 'Group')
    : (otherProfile?.display_name || 'Unknown');

  const lastTime = conversation.last_message_time
    ? formatConversationTime(conversation.last_message_time)
    : '';

  const isMyLastMsg = conversation.last_message_sender_id === currentUserId;

  const [preview, setPreview] = useState(conversation.last_message_text || 'Tap to chat');
  useEffect(() => {
    const raw = conversation.last_message_text;
    if (!raw || !isEncrypted(raw)) { setPreview(raw || 'Tap to chat'); return; }
    let cancelled = false;
    (async () => {
      try {
        const key = await getConversationKey(conversation, currentUserId, profilesMap);
        if (!key) { if (!cancelled) setPreview('🔒 Encrypted'); return; }
        const plain = await decryptText(raw, key);
        if (!cancelled) setPreview(plain || 'Tap to chat');
      } catch { if (!cancelled) setPreview('🔒 Encrypted'); }
    })();
    return () => { cancelled = true; };
  }, [conversation?.last_message_text, conversation?.id, currentUserId, profilesMap]);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-all border-b border-white/5 ${
        isActive
          ? 'bg-white/10 border-l-2 border-l-purple-500'
          : 'hover:bg-white/5'
      }`}
    >
      {conversation.type === 'channel' ? (
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <Megaphone size={20} className="text-white" />
        </div>
      ) : conversation.type === 'group' ? (
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <Users size={20} className="text-white" />
        </div>
      ) : (
        <Avatar src={otherProfile?.avatar_url} name={name} size="md" isOnline={otherProfile?.is_online} />
      )}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-white truncate flex items-center gap-1">
            {name}
            {conversation.type === 'direct' && otherProfile?.is_meta_verified && <VerifiedBadge size={13} />}
          </span>
          <span className={`text-[11px] shrink-0 ml-2 ${unreadCount > 0 ? 'text-purple-400 font-medium' : 'text-white/35'}`}>
            {lastTime}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5 gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {isMyLastMsg && (
              <CheckCheck size={13} className="text-purple-400 shrink-0" />
            )}
            <span className="text-xs text-white/45 truncate">
              {preview}
            </span>
          </div>
          {unreadCount > 0 && (
            <span className="shrink-0 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center bg-purple-600">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}