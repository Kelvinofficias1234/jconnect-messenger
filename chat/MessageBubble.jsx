import React, { useState, useRef } from 'react';
import { Check, CheckCheck, FileText, Download, X, Ban, Eye, EyeOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MessageActions from './MessageActions';
import { formatTime } from '@/lib/timeFormat';
import { isEncrypted } from '@/lib/e2ee';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import PollMessage from './PollMessage';
import LocationMessage from './LocationMessage';
import EventMessage from './EventMessage';

export default function MessageBubble({ message, isOwn, senderName, profilesMap, repliedMessage, currentUserId, onReact, onReply, onEdit, onDelete }) {
  const [lightbox, setLightbox] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [viewOnceOpened, setViewOnceOpened] = useState(false);
  const longPressRef = useRef(null);

  const isDeleted = message.deleted_for_everyone;
  const isEdited = !!message.edited_at;
  const isViewOnce = message.is_view_once;
  // Recipient sees a placeholder until they tap to open; sender always sees content with a badge.
  const showViewOncePlaceholder = isViewOnce && !isOwn && !viewOnceOpened && !isDeleted;

  const isImage = message.file_type === 'image' && message.file_url;
  const isVideo = message.file_type === 'video' && message.file_url;
  const isAudio = message.file_type === 'audio' && message.file_url;
  const isFile = message.file_url && !isImage && !isVideo && !isAudio;

  // Parse reactions grouped by emoji
  const reactionList = (message.reactions || []).map(r => {
    const idx = r.lastIndexOf(':');
    return { emoji: r.slice(0, idx), userId: r.slice(idx + 1) };
  });
  const reactionGroups = {};
  reactionList.forEach(r => {
    reactionGroups[r.emoji] = (reactionGroups[r.emoji] || 0) + 1;
  });

  const handleTouchStart = () => {
    longPressRef.current = setTimeout(() => setShowActions(true), 500);
  };
  const handleTouchEnd = () => clearTimeout(longPressRef.current);
  const handleContextMenu = (e) => { e.preventDefault(); setShowActions(true); };

  const handleReact = (emoji) => {
    const userReaction = (message.reactions || []).find(r => r.endsWith(`:${currentUserId}`));
    let next;
    if (userReaction && userReaction.startsWith(`${emoji}:`)) {
      next = (message.reactions || []).filter(r => r !== userReaction);
    } else {
      next = (message.reactions || []).filter(r => !r.endsWith(`:${currentUserId}`));
      next.push(`${emoji}:${currentUserId}`);
    }
    onReact?.(message, next);
  };

  const handleCopy = () => {
    if (message.text) navigator.clipboard.writeText(message.text);
  };

  // View Once: when the recipient closes the fullscreen viewer, auto-delete
  // the message for everyone. The realtime subscription syncs both sides.
  const handleViewOnceClose = async () => {
    setViewOnceOpened(false);
    try {
      await base44.entities.Message.update(message.id, { deleted_for_everyone: true, view_once_opened: true });
    } catch {}
  };

  const replyName = repliedMessage
    ? (repliedMessage.sender_id === currentUserId ? 'You' : (profilesMap?.[repliedMessage.sender_id]?.display_name || 'User'))
    : null;

  return (
    <>
      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10 bg-white/10 rounded-full p-2" onClick={() => setLightbox(false)}>
            <X size={22} />
          </button>
          <img src={message.file_url} alt="" className="max-w-[92vw] max-h-[88vh] rounded-2xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* View Once fullscreen viewer — auto-deletes on close */}
      {viewOnceOpened && isViewOnce && !isOwn && !isDeleted && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black"
          onClick={handleViewOnceClose}
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10 bg-white/10 rounded-full p-2" onClick={handleViewOnceClose}>
            <X size={22} />
          </button>
          <div className="absolute top-5 left-0 right-0 text-center">
            <span className="text-white/80 text-sm font-medium flex items-center justify-center gap-1.5">
              <Eye size={16} /> View Once — disappears when you close
            </span>
          </div>
          {isImage && <img src={message.file_url} alt="" draggable={false} className="max-w-[92vw] max-h-[80vh] object-contain" onClick={e => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()} />}
          {isVideo && <video src={message.file_url} controls autoPlay playsInline controlsList="nodownload" disablePictureInPicture className="max-w-[92vw] max-h-[80vh] rounded-2xl" onClick={e => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()} />}
          {isAudio && (
            <div className="w-[90vw] max-w-md" onClick={e => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
              <VoiceMessagePlayer src={message.file_url} isOwn={false} />
            </div>
          )}
          {isFile && (
            <a href={message.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/10 border border-white/20">
              <FileText size={24} className="text-purple-300" />
              <div>
                <p className="text-sm font-medium text-white">{message.file_name || 'File'}</p>
                <p className="text-xs text-white/50">Tap to download</p>
              </div>
              <Download size={18} className="text-white/50" />
            </a>
          )}
          {message.text && !isImage && !isVideo && !isAudio && !isFile && (
            <p className="text-white text-lg leading-relaxed text-center px-8 max-w-lg whitespace-pre-wrap break-words" onClick={e => e.stopPropagation()}>
              {isEncrypted(message.text) ? '🔒 Encrypted message' : message.text}
            </p>
          )}
        </div>
      )}

      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-0.5 px-3`}>
        <div className="relative max-w-[78%] sm:max-w-[65%]">
          {showActions && !isDeleted && (
            <div className="absolute z-50" style={{ bottom: '100%', marginBottom: '4px', right: isOwn ? 0 : 'auto', left: isOwn ? 'auto' : 0 }}>
              <MessageActions
                message={message}
                currentUserId={currentUserId}
                isOwn={isOwn}
                onReact={handleReact}
                onReply={() => onReply?.(message)}
                onEdit={() => onEdit?.(message)}
                onDelete={() => onDelete?.(message)}
                onCopy={handleCopy}
                onClose={() => setShowActions(false)}
              />
            </div>
          )}

          <div
            className={`rounded-2xl shadow-lg relative overflow-hidden ${isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
            style={{
              backgroundColor: isOwn ? '#6d28d9' : 'rgba(255,255,255,0.08)',
              backdropFilter: isOwn ? undefined : 'blur(8px)',
              border: isOwn ? '1px solid rgba(139,92,246,0.25)' : '1px solid rgba(255,255,255,0.07)',
            }}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
          >
            {!isOwn && senderName && !isDeleted && (
              <p className="text-xs font-semibold px-3 pt-2 text-purple-400">{senderName}</p>
            )}

            {repliedMessage && !isDeleted && (
              <div className="mx-3 mt-2 px-2.5 py-1.5 rounded-lg border-l-2 border-purple-400" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                <p className="text-xs font-semibold text-purple-300">{replyName}</p>
                <p className="text-[11px] text-white/50 truncate">
                  {repliedMessage.deleted_for_everyone ? 'Message was deleted' :
                   repliedMessage.text || (repliedMessage.file_url ? '📎 Attachment' : '')}
                </p>
              </div>
            )}

            {isDeleted ? (
              isViewOnce && message.view_once_opened ? (
                <div className="flex flex-col items-center gap-1.5 px-6 py-4 min-w-[140px]">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)' }}>
                    <Eye size={18} className="text-purple-300" />
                  </div>
                  <p className="text-sm text-white/60">Opened</p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-white/35">{formatTime(message.created_date)}</span>
                    {isOwn && (message.is_read ? <CheckCheck size={12} className="text-purple-300" /> : <Check size={12} className="text-white/35" />)}
                  </div>
                </div>
              ) : (
                <p className="text-sm italic px-3 py-2 text-white/40 flex items-center gap-1.5">
                  <Ban size={14} /> This message was deleted
                </p>
              )
            ) : showViewOncePlaceholder ? (
              <div
                onClick={() => setViewOnceOpened(true)}
                className="flex flex-col items-center justify-center gap-2 px-6 py-5 cursor-pointer hover:bg-white/5 transition-colors min-w-[160px]"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.2)' }}>
                  <Eye size={24} className="text-purple-300" />
                </div>
                <p className="text-sm font-semibold text-white/90">View Once</p>
                <p className="text-[11px] text-white/40">
                  {isImage ? 'Photo' : isVideo ? 'Video' : isAudio ? 'Voice note' : isFile ? 'File' : 'Message'}
                </p>
                <p className="text-[10px] text-purple-400/70">Tap to open · disappears after</p>
              </div>
            ) : (
              <>
                {message.message_type === 'poll' && (
                  <PollMessage message={message} currentUserId={currentUserId} isOwn={isOwn} />
                )}
                {message.message_type === 'location' && (
                  <LocationMessage message={message} isOwn={isOwn} currentUserId={currentUserId} />
                )}
                {message.message_type === 'event' && (
                  <EventMessage message={message} isOwn={isOwn} />
                )}
                {isImage && (
                  <div className="relative cursor-pointer" onClick={() => setLightbox(true)}>
                    <img src={message.file_url} alt="" className="w-full max-w-xs max-h-64 object-cover block" />
                  </div>
                )}
                {isVideo && (
                  <div className="p-1">
                    <video src={message.file_url} controls className="rounded-xl max-w-full max-h-56 w-full" />
                  </div>
                )}
                {isAudio && (
                  <div className="px-3 pt-2 pb-1">
                    <VoiceMessagePlayer src={message.file_url} isOwn={isOwn} />
                  </div>
                )}
                {isFile && (
                  <a href={message.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(155,48,255,0.2)' }}>
                      <FileText size={18} className="text-purple-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/90 truncate">{message.file_name || 'File'}</p>
                      <p className="text-[10px] text-white/40">Tap to download</p>
                    </div>
                    <Download size={14} className="text-white/40 shrink-0" />
                  </a>
                )}
                {message.text && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words px-3 pt-2 pb-1 text-white/95">
                    {isEncrypted(message.text) ? '🔒 Encrypted message' : message.text}
                  </p>
                )}
                <div className="flex items-center gap-1 justify-end px-3 pb-1.5 mt-0.5">
                  {isViewOnce && isOwn && (
                    <span className="text-[10px] text-purple-300 flex items-center gap-0.5">
                      <Eye size={10} /> View Once
                    </span>
                  )}
                  <span className="text-[10px] text-white/35">{formatTime(message.created_date)}</span>
                  {isEdited && <span className="text-[10px] text-white/35 italic">edited</span>}
                  {isOwn && (message.is_read ? <CheckCheck size={13} className="text-purple-300" /> : <Check size={13} className="text-white/35" />)}
                </div>
              </>
            )}
          </div>

          {Object.keys(reactionGroups).length > 0 && (
            <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(reactionGroups).map(([emoji, count]) => (
                <div key={emoji} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-white/60 text-[10px]">{count}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}