import React, { useState } from 'react';

const EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

export default function MessageReactions({ messageId, reactions = {}, currentUserId, onReact }) {
  const [showPicker, setShowPicker] = useState(false);

  const myReaction = Object.entries(reactions).find(([, ids]) => ids?.includes(currentUserId))?.[0];

  const handleReact = (emoji) => {
    onReact(messageId, emoji);
    setShowPicker(false);
  };

  const reactionEntries = Object.entries(reactions).filter(([, ids]) => ids?.length > 0);

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Existing reactions */}
      {reactionEntries.map(([emoji, ids]) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-all ${
            ids.includes(currentUserId)
              ? 'border-purple-500/50 bg-purple-500/20'
              : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
        >
          <span>{emoji}</span>
          <span className="text-white/60">{ids.length}</span>
        </button>
      ))}

      {/* Add reaction */}
      <button
        onClick={() => setShowPicker(p => !p)}
        className="text-white/30 hover:text-white/60 text-xs px-1 transition-colors"
      >
        +
      </button>

      {/* Picker */}
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-1 z-50 flex gap-1 p-2 rounded-2xl border border-white/15 shadow-2xl"
          style={{ backgroundColor: '#1e2140' }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => handleReact(e)}
              className="text-lg hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}