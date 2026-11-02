import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, MessageCircle, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Always show success
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  const bgStyle = { background: 'linear-gradient(180deg, #0d0b1e 0%, #1a1040 50%, #0d0b1e 100%)' };
  const cardStyle = { backgroundColor: 'rgba(20,15,45,0.9)', backdropFilter: 'blur(20px)' };
  const btnStyle = { background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 4px 20px rgba(155,48,255,0.35)' };

  return (
    <div className="min-h-screen flex flex-col text-white" style={bgStyle}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(140,60,255,0.35) 0%, transparent 70%)' }} />
      </div>
      <div className="relative z-10 p-4">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-5 pb-10 relative z-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 0 40px rgba(155,48,255,0.4)' }}>
                <MessageCircle size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">J-Connect</h1>
            </div>
            <p className="text-white/40 text-sm">Reset your password</p>
          </div>

          <div className="rounded-3xl border border-white/10 p-6 shadow-2xl" style={cardStyle}>
            {sent ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <p className="text-white font-semibold mb-2">Check your inbox</p>
                <p className="text-sm text-white/45 leading-relaxed">
                  If an account exists for <span className="text-purple-400">{email}</span>, you'll receive a reset link shortly.
                </p>
                <Link to="/login" className="inline-block mt-6 text-sm font-semibold text-purple-400 hover:text-purple-300">
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/70" />
                    <Input type="email" autoComplete="email" autoFocus placeholder="you@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-2xl border-white/10 text-white placeholder:text-white/20 focus-visible:ring-purple-500"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} required />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 rounded-2xl font-bold text-white border-0" style={btnStyle} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send Reset Link'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}