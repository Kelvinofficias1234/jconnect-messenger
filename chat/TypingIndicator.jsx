import React from 'react';

export default function TypingIndicator({ name }) {
  return (
    <div className="flex justify-start mb-2 px-3">
      <div
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg rounded-tl-none"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-xs text-white/50 mr-1">{name} is typing</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}