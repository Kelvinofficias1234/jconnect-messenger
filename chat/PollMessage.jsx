import React, { useEffect, useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PollMessage({ message, currentUserId, isOwn }) {
  const [poll, setPoll] = useState(null);

  useEffect(() => {
    try {
      setPoll(JSON.parse(message.poll_data));
    } catch { setPoll(null); }
  }, [message.poll_data]);

  if (!poll) return null;

  const totalVotes = poll.options.reduce((sum, o) => sum + (o.voters?.length || 0), 0);
  const hasVoted = poll.options.some(o => o.voters?.includes(currentUserId));

  const handleVote = async (optionId) => {
    if (hasVoted) return; // One vote per user
    const updated = {
      ...poll,
      options: poll.options.map(o =>
        o.id === optionId ? { ...o, voters: [...(o.voters || []), currentUserId] } : o
      )
    };
    setPoll(updated);
    await base44.entities.Message.update(message.id, {
      poll_data: JSON.stringify(updated)
    });
  };

  return (
    <div className="px-3 py-2 min-w-[220px] max-w-[280px]">
      <p className="text-sm font-semibold text-white mb-1">{poll.question}</p>
      <p className="text-[11px] text-white/40 mb-3">📊 {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</p>
      <div className="space-y-2">
        {poll.options.map(opt => {
          const votes = opt.voters?.length || 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const voted = opt.voters?.includes(currentUserId);
          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={hasVoted}
              className="relative w-full text-left rounded-lg overflow-hidden border border-white/10 disabled:cursor-default hover:border-purple-500/40 transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              {hasVoted && (
                <div className="absolute inset-0 transition-all"
                  style={{
                    width: `${pct}%`,
                    background: voted
                      ? 'linear-gradient(90deg, rgba(124,58,237,0.25), rgba(124,58,237,0.15))'
                      : 'rgba(255,255,255,0.06)'
                  }} />
              )}
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className="text-sm text-white/90 flex items-center gap-2">
                  {voted && <Check size={14} className="text-purple-400" />}
                  {opt.text}
                </span>
                {hasVoted && <span className="text-xs text-white/50 font-medium">{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}