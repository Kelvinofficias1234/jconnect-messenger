import React, { useState } from 'react';
import { X, Check, Info, Loader2, ShieldCheck, ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';

// Meta Verified subscription tiers — matches the three official package cards.
// When the app owner grants a badge for free via the J-Connect Bot, the "max"
// tier is applied, so all features below are unlocked at no cost.
const TIERS = [
  {
    id: 'plus',
    name: 'Business Plus',
    tagline: 'Gain momentum with more benefits',
    oldPrice: 17.49,
    price: 15.49,
    recommended: true,
    features: [
      { label: 'Verified badge' },
      { label: 'Business broadcasts', info: true, sub: 'Reach your customers with 1000 delivered messages per month.' },
      { label: 'Impersonation protection' },
      { label: 'Enhanced support', sub: 'Get issues resolved more quickly. Dedicated in-app support' },
      { label: 'Verified channel' }
    ],
    grant: { verified_tier: 'plus', broadcast_limit: 1000, protected_accounts_limit: 0, verified_channel_enabled: true, active_case_monitoring: false, subscription_amount: 15.49 }
  },
  {
    id: 'premium',
    name: 'Business Premium',
    tagline: 'Get the tools to deepen engagement',
    oldPrice: 51.90,
    price: 41.49,
    recommended: false,
    features: [
      { label: 'Verified badge' },
      { label: 'Business broadcasts', info: true, sub: 'Reach your customers with 2500 delivered messages per month.' },
      { label: 'Impersonation protection' },
      { label: 'Protected business accounts', sub: 'Up to 10 included' },
      { label: 'Enhanced support', sub: 'Get issues resolved more quickly. Dedicated in-app support' }
    ],
    grant: { verified_tier: 'premium', broadcast_limit: 2500, protected_accounts_limit: 10, verified_channel_enabled: true, active_case_monitoring: false, subscription_amount: 41.49 }
  },
  {
    id: 'max',
    name: 'Business Max',
    tagline: 'Protect and optimize your business',
    oldPrice: 172.99,
    price: 120.99,
    recommended: false,
    features: [
      { label: 'Verified badge' },
      { label: 'Business broadcasts', info: true, sub: 'Reach your customers with 10000 delivered messages per month.' },
      { label: 'Impersonation protection' },
      { label: 'Protected business accounts', sub: 'Up to 50 included' },
      { label: 'Enhanced support', sub: 'Get issues resolved more quickly. Dedicated in-app support. Active case monitoring' },
      { label: 'Active case monitoring' }
    ],
    grant: { verified_tier: 'max', broadcast_limit: 10000, protected_accounts_limit: 50, verified_channel_enabled: true, active_case_monitoring: true, subscription_amount: 120.99 }
  }
];

export default function GetVerifiedModal({ profile, onClose, onSuccess }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const tier = TIERS[activeIdx];

  const handleSubscribe = async () => {
    setError('');
    setProcessing(true);
    try {
      await base44.entities.Profile.update(profile.id, {
        is_meta_verified: true,
        subscription_status: 'active',
        ...tier.grant
      });
      setProcessing(false);
      setDone(true);
      setTimeout(() => { onSuccess?.(); onClose(); }, 1400);
    } catch (e) {
      setProcessing(false);
      setError('Subscription could not be completed. Please try again.');
    }
  };

  const goPrev = () => setActiveIdx(i => (i - 1 + TIERS.length) % TIERS.length);
  const goNext = () => setActiveIdx(i => (i + 1) % TIERS.length);

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: '#1a1a1a', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="relative flex flex-col items-center pt-5 pb-3 px-4 shrink-0">
          <button onClick={onClose} className="absolute left-3 top-3 text-white/50 hover:text-white transition-colors">
            <X size={22} />
          </button>
          <div className="flex items-center gap-1.5 mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
              <path d="M7 12.5l3 3 7-7" stroke="#1877F2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-white font-bold text-sm tracking-wide">Meta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold text-base">{profile?.display_name || 'You'}</span>
            <BadgeCheck size={18} className="text-[#1877F2]" fill="#1877F2" />
          </div>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#1877F2' }}>
              <Check size={32} className="text-white" strokeWidth={3} />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">You're Verified!</h4>
            <p className="text-sm text-white/60">{tier.name} is now active on your profile.</p>
          </div>
        ) : (
          <>
            {/* Carousel viewport */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-2">
              <div className="rounded-2xl border border-white/15 p-5" style={{ backgroundColor: '#1a1a1a' }}>
                {tier.recommended && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-full mb-3"
                    style={{ backgroundColor: '#007AFF' }}>
                    Recommended
                  </span>
                )}
                <h2 className="text-xl font-bold text-white mb-1">{tier.name}</h2>
                <p className="text-sm text-white/60 mb-4">{tier.tagline}</p>

                {/* Price */}
                <p className="text-sm text-white/80 leading-relaxed mb-1">
                  Welcome offer{' '}
                  <span className="line-through text-white/40">${tier.oldPrice}</span>{' '}
                  <span className="font-semibold" style={{ color: '#ff5e5e' }}>${tier.price}</span>
                  <span className="text-white/60">/month per profile for your first year.</span>
                </p>
                <p className="flex items-center gap-1 text-[11px] mb-4" style={{ color: '#5C9DFF' }}>
                  <Info size={11} /> Trial benefit. Learn more
                </p>

                {/* Features */}
                <ul className="space-y-3">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check size={16} className="text-white shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-white flex items-center gap-1">
                          {f.label}
                          {f.info && <Info size={11} className="text-white/40" />}
                        </p>
                        {f.sub && (
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#4cd964' }}>
                            {f.sub}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Carousel controls */}
              <div className="flex items-center justify-center gap-3 mt-3 mb-1">
                <button onClick={goPrev} disabled={activeIdx === 0}
                  className="p-1.5 rounded-full disabled:opacity-30 transition-opacity"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <ChevronLeft size={16} className="text-white" />
                </button>
                <div className="flex gap-1.5">
                  {TIERS.map((t, i) => (
                    <button key={t.id} onClick={() => setActiveIdx(i)}
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: i === activeIdx ? 20 : 6,
                        backgroundColor: i === activeIdx ? '#007AFF' : 'rgba(255,255,255,0.25)'
                      }} />
                  ))}
                </div>
                <button onClick={goNext} disabled={activeIdx === TIERS.length - 1}
                  className="p-1.5 rounded-full disabled:opacity-30 transition-opacity"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <ChevronRight size={16} className="text-white" />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 pt-3 pb-5 shrink-0 border-t border-white/10">
              {error && <p className="text-xs text-red-400 mb-2 text-center">{error}</p>}
              <button onClick={handleSubscribe} disabled={processing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-white transition-all disabled:opacity-60"
                style={{ backgroundColor: '#007AFF' }}>
                {processing ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <>Get {tier.name}</>}
              </button>
              <p className="text-center text-[11px] mt-3" style={{ color: '#5C9DFF' }}>
                Why you're seeing this package
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}