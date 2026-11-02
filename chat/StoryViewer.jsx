import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Send } from 'lucide-react';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { base44 } from '@/api/base44Client';
import { formatStoryTime } from '@/lib/timeFormat';

export default function StoryViewer({ stories, profile, currentUserId, profilesMap, onClose, onViewed, canDelete, onDelete }) {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim() || canDelete) return;
    try {
      const convos = await base44.entities.Conversation.list(500);
      let convo = convos.find(c =>
        c.type === 'direct' &&
        c.participant_ids?.includes(currentUserId) &&
        c.participant_ids?.includes(story.user_id)
      );
      if (!convo) {
        convo = await base44.entities.Conversation.create({
          type: 'direct',
          participant_ids: [currentUserId, story.user_id],
          last_message_time: new Date().toISOString()
        });
      }
      await base44.entities.Message.create({
        conversation_id: convo.id,
        sender_id: currentUserId,
        text: replyText.trim()
      });
      await base44.entities.Conversation.update(convo.id, {
        last_message_text: replyText.trim(),
        last_message_time: new Date().toISOString(),
        last_message_sender_id: currentUserId
      });
      setReplyText('');
      setReplySent(true);
      setTimeout(() => setReplySent(false), 2000);
    } catch (e) {
      console.error('Reply failed:', e);
    }
  };

  const story = stories[idx];

  useEffect(() => {
    if (!story) return;
    if (currentUserId && story.user_id !== currentUserId && !story.viewed_by?.includes(currentUserId)) {
      onViewed?.(story.id, currentUserId);
    }
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (idx < stories.length - 1) setIdx(i => i + 1);
          else onClose();
          return 0;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [idx, story?.id]);

  if (!story) return null;

  const handleDelete = async () => {
    if (!confirm('Delete this status?')) return;
    await onDelete?.(story.id);
  };

  // WhatsApp-style posted timestamp — relative, location-aware (timezone-independent)
  const postedLabel = formatStoryTime(story.created_date);

  const viewers = (story.viewed_by || []).map(uid => profilesMap?.[uid]).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#000' }}>
      <div className="flex gap-1 px-3 pt-3 pb-1 shrink-0">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 px-4 py-3 shrink-0">
        <Avatar src={profile?.avatar_url} name={profile?.display_name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-white text-sm font-semibold truncate">{profile?.display_name}</p>
            {profile?.is_meta_verified && <VerifiedBadge size={13} />}
          </div>
          <p className="text-white/50 text-xs">{postedLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && (
            <button onClick={handleDelete} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
              <Trash2 size={18} className="text-red-400" />
            </button>
          )}
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <X size={22} className="text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 relative">
        {story.type === 'image' ? (
          <div className="w-full">
            <img src={story.content} alt="" className="w-full max-h-[70vh] object-contain rounded-2xl" />
          </div>
        ) : (
          <div className="w-full aspect-square rounded-2xl flex items-center justify-center p-8"
            style={{ backgroundColor: story.background_color || '#7c3aed' }}>
            <p className="text-white text-xl font-semibold text-center leading-relaxed">{story.content}</p>
          </div>
        )}
        <button className="absolute left-0 top-0 w-1/3 h-full"
          onClick={() => idx > 0 ? setIdx(i => i - 1) : onClose()} />
        <button className="absolute right-0 top-0 w-1/3 h-full"
          onClick={() => idx < stories.length - 1 ? setIdx(i => i + 1) : onClose()} />
      </div>

      {canDelete && (
        <div className="px-4 py-4 shrink-0">
          <button onClick={() => setShowViewers(s => !s)}
            className="w-full flex items-center justify-center gap-2 text-white/60 text-sm hover:text-white transition-colors">
            <Eye size={14} />
            <span>{viewers.length} {viewers.length === 1 ? 'view' : 'views'}</span>
          </button>
          {showViewers && (
            <div className="mt-3 max-h-40 overflow-y-auto scrollbar-hide space-y-2">
              {viewers.length === 0 ? (
                <p className="text-center text-xs text-white/40 py-2">No views yet</p>
              ) : viewers.map(p => (
                <div key={p.user_id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/5">
                  <Avatar src={p.avatar_url} name={p.display_name} size="xs" />
                  <span className="text-sm text-white/80 truncate">{p.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reply input (non-owner stories only) */}
      {!canDelete && (
        <div className="px-4 py-4 shrink-0">
          {replySent ? (
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
              <Send size={14} />
              <span>Reply sent!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReply()}
                placeholder={`Reply to ${profile?.display_name || 'status'}...`}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              <button onClick={handleReply} disabled={!replyText.trim()}
                className="text-purple-400 disabled:opacity-30 hover:text-purple-300 transition-colors">
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}