import React from 'react';
import { Shield, ShieldCheck, X, Lock, Clock, Server } from 'lucide-react';

export default function BackupPrompt({ onEnable, onSkip }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,5,15,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden border border-purple-500/30 shadow-2xl"
        style={{ background: 'linear-gradient(160deg, #0f0c25 0%, #15103a 50%, #0f0c25 100%)' }}>
        {/* Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(155,48,255,0.25) 0%, transparent 70%)' }} />

        <button onClick={onSkip}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10">
          <X size={20} />
        </button>

        <div className="relative px-7 pt-10 pb-8 text-center">
          {/* Shield icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 0 40px rgba(155,48,255,0.5)' }}>
            <ShieldCheck size={40} className="text-white" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Auto Backup</h2>
          <p className="text-purple-400/80 text-sm font-medium mb-5">Automatic &amp; Encrypted</p>

          <p className="text-white/60 text-sm leading-relaxed mb-6">
            Your <span className="text-white font-medium">chats, media, events, contacts</span> and settings
            will be automatically backed up to J-Connect's encrypted cloud.
          </p>

          <div className="space-y-3 mb-7 text-left">
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(155,48,255,0.08)' }}>
              <Lock size={18} className="text-purple-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Encrypted &amp; Redundant</p>
                <p className="text-white/45 text-xs">Every message is stored securely on the server the instant it's sent.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(155,48,255,0.08)' }}>
              <Clock size={18} className="text-purple-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Lasts Forever</p>
                <p className="text-white/45 text-xs">Away for a day or a century — your data is always waiting for you.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(155,48,255,0.08)' }}>
              <Server size={18} className="text-purple-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Automatic &amp; Silent</p>
                <p className="text-white/45 text-xs">Backup runs in the background — no manual steps, ever.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <button onClick={onEnable}
              className="w-full h-12 rounded-xl font-semibold text-white text-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 4px 20px rgba(155,48,255,0.4)' }}>
              <ShieldCheck size={18} /> Enable Auto Backup
            </button>
            <button onClick={onSkip}
              className="w-full h-12 rounded-xl font-medium text-white/50 text-sm hover:text-white/70 transition-colors">
              Not Now
            </button>
          </div>
          <p className="text-white/30 text-[11px] mt-4 leading-relaxed">
            You can change this anytime in Settings. If you skip, your data still lives on the server but
            without the automatic backup heartbeat and recovery manifest.
          </p>
        </div>
      </div>
    </div>
  );
}