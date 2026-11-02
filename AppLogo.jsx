import React from 'react';
import { MessageCircle } from 'lucide-react';

const SIZES = {
  sm: { box: 'w-8 h-8', icon: 16 },
  md: { box: 'w-9 h-9', icon: 18 },
  lg: { box: 'w-12 h-12', icon: 24 },
  xl: { box: 'w-16 h-16', icon: 34 },
};

export default function AppLogo({ size = 'md', name = 'J-Connect', showName = true, className = '', textClassName = '' }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${s.box} rounded-full flex items-center justify-center shrink-0`}
        style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 0 20px rgba(155,48,255,0.35)' }}
      >
        <MessageCircle size={s.icon} className="text-white" />
      </div>
      {showName && (
        <span className={`font-bold text-white tracking-tight ${textClassName}`}>{name}</span>
      )}
    </div>
  );
}