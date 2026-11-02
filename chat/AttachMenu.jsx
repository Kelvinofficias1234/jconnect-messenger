import React from 'react';
import { MapPin, BarChart3, FileText, Image, Calendar, Camera } from 'lucide-react';

const OPTIONS = [
  { key: 'camera', label: 'Camera', icon: Camera, color: '#ec4899' },
  { key: 'photo', label: 'Photos', icon: Image, color: '#8b5cf6' },
  { key: 'document', label: 'Docs', icon: FileText, color: '#3b82f6' },
  { key: 'location', label: 'Location', icon: MapPin, color: '#ef4444' },
  { key: 'poll', label: 'Poll', icon: BarChart3, color: '#f59e0b' },
  { key: 'event', label: 'Event', icon: Calendar, color: '#10b981' },
];

export default function AttachMenu({ onSelect, onClose, fileRef }) {
  return (
    <>
      <div className="fixed inset-0 z-[200]" onClick={onClose} />
      <div
        className="fixed bottom-20 right-4 z-[210] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#1e2140',
          animation: 'attachSlideUp 0.2s cubic-bezier(0.16,1,0.3,1)',
          width: '300px',
        }}
      >
        <div className="px-4 pt-4 pb-1">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Attach</p>
        </div>
        <div className="px-4 pb-5 pt-3">
          <div className="grid grid-cols-3 gap-x-3 gap-y-5">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (opt.key === 'photo') fileRef.current?.click();
                    else onSelect(opt.key);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-90"
                    style={{ backgroundColor: opt.color, boxShadow: `0 4px 16px ${opt.color}40` }}
                  >
                    <Icon size={24} className="text-white" />
                  </div>
                  <span className="text-xs text-white/70 font-medium text-center">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}