import React, { useState } from 'react';
import { X, Type, Image, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

const BG_COLORS = ['#0d9488', '#7c3aed', '#dc2626', '#2563eb', '#d97706', '#db2777', '#059669', '#4f46e5'];

export default function CreateStory({ userId, onClose, onCreated }) {
  const [mode, setMode] = useState(null);
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [uploading, setUploading] = useState(false);

  const handleTextStory = async () => {
    if (!text.trim()) return;
    await base44.entities.Story.create({
      user_id: userId,
      type: 'text',
      content: text.trim(),
      background_color: bgColor,
      viewed_by: [],
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    onCreated?.();
    onClose();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Story.create({
      user_id: userId,
      type: 'image',
      content: file_url,
      viewed_by: [],
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    setUploading(false);
    onCreated?.();
    onClose();
  };

  if (!mode) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div className="rounded-2xl p-6 w-full max-w-sm border border-white/10" style={{ backgroundColor: '#13152a' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-semibold text-lg text-white">Create Story</h3>
            <button onClick={onClose}><X size={20} className="text-white/50" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('text')}
              className="flex flex-col items-center gap-2 p-6 rounded-xl hover:bg-white/10 transition-colors border border-white/10"
              style={{ backgroundColor: '#1e2140' }}
            >
              <Type size={28} className="text-purple-400" />
              <span className="text-sm font-medium text-white">Text</span>
            </button>
            <label className="flex flex-col items-center gap-2 p-6 rounded-xl hover:bg-white/10 transition-colors cursor-pointer border border-white/10" style={{ backgroundColor: '#1e2140' }}>
              <Image size={28} className="text-purple-400" />
              <span className="text-sm font-medium text-white">Photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { setMode('image'); handleImageUpload(e); }} />
            </label>
          </div>
          {uploading && <p className="text-sm text-white/50 text-center mt-4">Uploading...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMode(null)} className="text-white/70 hover:text-white text-sm">← Back</button>
          <button onClick={onClose}><X size={20} className="text-white/70" /></button>
        </div>
        <div
          className="aspect-square rounded-2xl flex items-center justify-center p-6 mb-4"
          style={{ backgroundColor: bgColor }}
        >
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type your story..."
            className="bg-transparent border-none text-white text-xl font-semibold text-center resize-none placeholder:text-white/50 focus-visible:ring-0"
            rows={5}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {BG_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setBgColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${bgColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Button onClick={handleTextStory} size="sm" className="gap-2 rounded-full">
            <Send size={16} /> Post
          </Button>
        </div>
      </div>
    </div>
  );
}