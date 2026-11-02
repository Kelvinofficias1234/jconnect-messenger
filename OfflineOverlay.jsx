import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import AppLogo from '@/components/AppLogo';

/**
 * OfflineOverlay — Branded full-screen overlay shown when the device loses
 * network connectivity. Prevents blank/white screens and browser connection
 * errors. Auto-dismisses when connectivity returns.
 *
 * Modular: mounts globally in App.jsx, does not touch any existing logic.
 */
export default function OfflineOverlay() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };
    const handleOnline = () => {
      setIsOffline(false);
      // Keep wasOffline true briefly so we can show a "Back online" toast
      setTimeout(() => setWasOffline(false), 2000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Also poll every 10s as a fallback (some browsers don't fire reliably)
    const poll = setInterval(() => {
      if (!navigator.onLine && !isOffline) setIsOffline(true);
      if (navigator.onLine && isOffline) setIsOffline(false);
    }, 10000);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearInterval(poll);
    };
  }, [isOffline]);

  // Don't render anything if online and never went offline
  if (!isOffline && !wasOffline) return null;

  // Brief "Back online" confirmation
  if (!isOffline && wasOffline) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-full flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300"
        style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
        <RefreshCw size={14} className="text-white" />
        <span className="text-sm font-semibold text-white">Back online</span>
      </div>
    );
  }

  // Full-screen branded offline overlay
  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(180deg, #0d0b1e 0%, #1a1040 50%, #0d0b1e 100%)' }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(140,60,255,0.4) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm">
        {/* Logo */}
        <AppLogo size="xl" textClassName="text-3xl" />

        {/* Offline icon */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <WifiOff size={36} className="text-red-400" />
        </div>

        {/* Message */}
        <div>
          <h2 className="text-xl font-bold text-white mb-2">You're offline</h2>
          <p className="text-sm text-white/40 leading-relaxed">
            J-Connect can't reach the server right now. Your messages are saved and will
            send automatically when you're back online.
          </p>
        </div>

        {/* Retry button */}
        <button
          onClick={() => {
            if (navigator.onLine) {
              setIsOffline(false);
              window.location.reload();
            }
          }}
          disabled={navigator.onLine}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #9b30ff, #6b21d6)',
            boxShadow: '0 4px 20px rgba(155,48,255,0.35)',
          }}>
          <RefreshCw size={16} className="text-white" />
          <span className="text-white">Try again</span>
        </button>

        {/* Subtle hint */}
        <p className="text-xs text-white/20">
          Waiting for connection…
        </p>
      </div>
    </div>
  );
}