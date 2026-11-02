import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle, MessageCircle, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const bgStyle = { background: 'linear-gradient(180deg, #0d0b1e 0%, #1a1040 50%, #0d0b1e 100%)' };
  const cardStyle = { backgroundColor: 'rgba(20,15,45,0.9)', backdropFilter: 'blur(20px)' };
  const btnStyle = { background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 4px 20px rgba(155,48,255,0.35)' };

  if (!resetToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-white" style={bgStyle}>
        <AlertTriangle className="w-16 h-16 text-yellow-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invalid reset link</h1>
        <p className="text-white/50 text-sm mb-6">This link is incomplete or expired.</p>
        <Link to="/forgot-password" className="text-purple-400 font-semibold hover:text-purple-300">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-white" style={bgStyle}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(140,60,255,0.35) 0%, transparent 70%)' }} />
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
            <p className="text-white/40 text-sm">Set a new password</p>
          </div>

          <div className="rounded-3xl border border-white/10 p-6 shadow-2xl" style={cardStyle}>
            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-wide">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/70" />
                  <Input type={showPass ? 'text' : 'password'} autoComplete="new-password" autoFocus placeholder="Min. 8 characters"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 rounded-2xl border-white/10 text-white placeholder:text-white/20 focus-visible:ring-purple-500"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} required />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/70" />
                  <Input type="password" autoComplete="new-password" placeholder="••••••••"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 rounded-2xl border-white/10 text-white placeholder:text-white/20 focus-visible:ring-purple-500"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} required />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-2xl font-bold text-white border-0" style={btnStyle} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : <><CheckCircle className="w-4 h-4 mr-2" />Reset Password</>}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}