import React, { useState } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';

export default function PollCreator({ onSend, onCancel }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const updateOption = (i, val) => {
    setOptions(prev => prev.map((o, idx) => idx === i ? val : o));
  };
  const addOption = () => {
    if (options.length >= 10) return;
    setOptions(prev => [...prev, '']);
  };
  const removeOption = (i) => {
    setOptions(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSend = () => {
    const cleanOptions = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) return;
    const pollData = {
      question: question.trim(),
      options: cleanOptions.map((text, i) => ({ id: `opt_${i}`, text, voters: [] }))
    };
    onSend(JSON.stringify(pollData));
  };

  return (
    <div className="px-3 py-3 shrink-0 border-t border-white/5" style={{ backgroundColor: '#13152a' }}>
      <div className="rounded-2xl border border-white/10 p-4 space-y-3" style={{ backgroundColor: '#1e2140' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3Icon /> Create Poll
          </h3>
          <button onClick={onCancel} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <input
          autoFocus
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask a question…"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
        />
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
              />
              {options.length > 2 && (
                <button onClick={() => removeOption(i)} className="text-white/30 hover:text-red-400 shrink-0">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 10 && (
          <button onClick={addOption}
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 font-medium">
            <Plus size={16} /> Add option
          </button>
        )}
        <button onClick={handleSend} disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <Check size={16} className="inline mr-1" /> Send Poll
        </button>
      </div>
    </div>
  );
}

function BarChart3Icon() {
  return <span className="text-amber-400">📊</span>;
}