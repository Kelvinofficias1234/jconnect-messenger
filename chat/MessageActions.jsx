import React from 'react';
import { Reply, Edit2, Trash2, Copy, Check } from 'lucide-react';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageActions({ message, isOwn, currentUserId, onReact, onReply, onEdit, onDelete, onCopy, onClose }) {
  const handleReact = (emoji) => { onReact(emoji); onClose(); };

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div className="absolute z-[61] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#1e2140', minWidth: '200px' }}>
        {/* Quick reactions */}
        <div className="flex justify-around px-2 py-2 border-b border-white/8">
          {QUICK_REACTIONS.map(emoji => {
            const hasReacted = (message.reactions || []).some(r => r === `${emoji}:${currentUserId}`);
            return (
              <button key={emoji} onClick={() => handleReact(emoji)}
                className={`w-8 h-8 flex items-center justify-center text-xl rounded-full transition-transform hover:scale-125 ${hasReacted ? 'bg-purple-600/30' : ''}`}>
                {emoji}
              </button>
            );
          })}
        </div>
        {/* Actions */}
        <button onClick={() => { onCopy(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/8 transition-colors text-left">
          <Copy size={16} className="text-white/50" /> Copy
        </button>
        <button onClick={() => { onReply(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/8 transition-colors text-left">
          <Reply size={16} className="text-white/50" /> Reply
        </button>
        {isOwn && message.text && !message.deleted_for_everyone && (
          <button onClick={() => { onEdit(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/8 transition-colors text-left">
            <Edit2 size={16} className="text-white/50" /> Edit
          </button>
        )}
        {isOwn && (
          <button onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/8 transition-colors text-left">
            <Trash2 size={16} /> Delete
          </button>
        )}
      </div>
    </>
  );
}