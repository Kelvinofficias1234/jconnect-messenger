import React from 'react';

const COLORS = [
  'bg-teal-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-sky-500',
  'bg-violet-500', 'bg-pink-500', 'bg-amber-500', 'bg-rose-500'
];

export default function Avatar({ src, name = '', size = 'md', isOnline, className = '' }) {
  const sizeClasses = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl'
  };

  const dotSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5'
  };

  const initial = (name || '?').charAt(0).toUpperCase();
  const colorIdx = name ? name.charCodeAt(0) % COLORS.length : 0;

  return (
    <div className={`relative shrink-0 ${className}`}>
      {src ? (
        <img src={src} alt={name} className={`${sizeClasses[size]} rounded-full object-cover`} />
      ) : (
        <div className={`${sizeClasses[size]} ${COLORS[colorIdx]} rounded-full flex items-center justify-center text-white font-semibold`}>
          {initial}
        </div>
      )}
      {isOnline !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-white ${isOnline ? 'bg-[#25d366]' : 'bg-[#d1d7db]'}`} />
      )}
    </div>
  );
}