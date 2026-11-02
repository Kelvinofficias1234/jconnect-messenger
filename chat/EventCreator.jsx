import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Send } from 'lucide-react';

export default function EventCreator({ onSend, onCancel }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const handleSend = () => {
    if (!title.trim() || !date) return;
    onSend(JSON.stringify({
      title: title.trim(),
      date,
      time: time || '',
      location: location.trim(),
      description: description.trim()
    }));
  };

  return (
    <div className="shrink-0 border-t border-white/5 p-3 space-y-3" style={{ backgroundColor: '#13152a' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Calendar size={16} className="text-purple-400" /> Create Event
        </h3>
        <button onClick={onCancel} className="text-white/40 hover:text-white"><X size={18} /></button>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title"
        autoFocus
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50" />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] text-white/40 flex items-center gap-1"><Calendar size={11} /> Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-white/40 flex items-center gap-1"><Clock size={11} /> Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50" />
        </div>
      </div>
      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="📍 Location (optional)"
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50" />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 resize-none" />
      <button onClick={handleSend} disabled={!title.trim() || !date}
        className="w-full rounded-xl py-2.5 font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 transition-transform active:scale-95"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
        <Send size={16} /> Send Event
      </button>
    </div>
  );
}