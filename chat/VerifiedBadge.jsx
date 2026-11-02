import React from 'react';
import { Check } from 'lucide-react';

export default function VerifiedBadge({ size = 14, className = '' }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: '#1877F2' }}
      title="Meta Verified"
    >
      <Check size={Math.max(8, size * 0.7)} className="text-white" strokeWidth={3} />
    </span>
  );
}