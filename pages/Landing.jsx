import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageCircle, ArrowRight, Shield, Users, Smartphone, Mail, UserPlus } from 'lucide-react';

export default function Landing() {
  const { username } = useParams();

  // Capture deep-link referral: jconnect.app/@username → store for post-registration
  useEffect(() => {
    if (username) {
      localStorage.setItem('referral_username', username.toLowerCase());
    }
  }, [username]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 text-white relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0d0b1e 0%, #1a1040 50%, #0d0b1e 100%)' }}>

      {/* Orb backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(140,60,255,0.4) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(90,40,200,0.25) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center mb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 0 60px rgba(155,48,255,0.5)' }}>
              <MessageCircle size={30} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">J-Connect</h1>
          </div>
          <p className="text-white/50 text-sm">Connect with your Friends and Family World Wide</p>
        </div>

        <div className="space-y-3">
          <div className="text-center mb-3">
            <p className="text-white/60 text-sm">Sign in or create an account with your email</p>
          </div>

          <Link to="/login"
            className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl text-lg font-bold text-white transition-all hover:opacity-90 active:scale-95 shadow-xl"
            style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 4px 24px rgba(155,48,255,0.4)' }}>
            <Mail size={20} /> Sign in with Email
          </Link>

          <Link to="/register"
            className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl text-base font-semibold text-white/80 border border-purple-500/30 transition-all hover:bg-purple-500/10"
            style={{ backgroundColor: 'rgba(155,48,255,0.06)' }}>
            <UserPlus size={20} /> Create an Account
          </Link>
        </div>

        {/* Features */}
        <div className="flex items-center justify-center gap-6 text-white/25 text-xs mt-6">
          <div className="flex items-center gap-1.5"><Shield size={12} className="text-purple-500" /> Encrypted</div>
          <div className="flex items-center gap-1.5"><Users size={12} className="text-purple-500" /> Groups</div>
          <div className="flex items-center gap-1.5"><Smartphone size={12} className="text-purple-500" /> Multi-device</div>
        </div>
      </div>
    </div>
  );
}