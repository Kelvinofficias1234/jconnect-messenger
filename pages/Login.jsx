import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Eye, EyeOff, MessageCircle, ArrowLeft } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import { Checkbox } from "@/components/ui/checkbox";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (rememberMe) {
        localStorage.removeItem('jc_chose_no_remember');
        sessionStorage.removeItem('jc_no_remember');
      } else {
        localStorage.setItem('jc_chose_no_remember', '1');
        sessionStorage.setItem('jc_no_remember', '1');
      }
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (rememberMe) {
      localStorage.removeItem('jc_chose_no_remember');
      sessionStorage.removeItem('jc_no_remember');
    } else {
      localStorage.setItem('jc_chose_no_remember', '1');
      sessionStorage.setItem('jc_no_remember', '1');
    }
    base44.auth.loginWithProvider("google", "/");
  };

  return (
    <div className="min-h-screen flex flex-col text-white"
      style={{ background: 'linear-gradient(180deg, #0d0b1e 0%, #1a1040 50%, #0d0b1e 100%)' }}>

      {/* Orb */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(140,60,255,0.35) 0%, transparent 70%)' }} />
      </div>

      {/* Back button */}
      <div className="relative z-10 p-4">
        <Link to="/welcome" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 pb-10 relative z-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 0 40px rgba(155,48,255,0.4)' }}>
                <MessageCircle size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">J-Connect</h1>
            </div>
            <p className="text-white/40 text-sm">Welcome back</p>
          </div>

          <div className="rounded-3xl border border-white/10 p-6 shadow-2xl"
            style={{ backgroundColor: 'rgba(20,15,45,0.9)', backdropFilter: 'blur(20px)' }}>

            {/* Google */}
            <Button variant="outline"
              className="w-full h-12 text-sm font-medium mb-5 border-white/15 text-white/80 hover:bg-white/8 hover:text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              onClick={handleGoogle}>
              <GoogleIcon className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/8" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 text-white/25 font-medium" style={{ backgroundColor: 'rgba(20,15,45,0.9)' }}>or continue with email</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/70" />
                  <Input type="email" autoComplete="email" autoFocus placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-2xl border-white/10 text-white placeholder:text-white/20 focus-visible:ring-purple-500"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-purple-400 hover:text-purple-300 font-medium">Forgot?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/70" />
                  <Input type={showPass ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 rounded-2xl border-white/10 text-white placeholder:text-white/20 focus-visible:ring-purple-500"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} required />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2.5 pt-1">
                <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
                <label htmlFor="remember-me" className="text-sm text-white/60 cursor-pointer select-none">Remember me on this device</label>
              </div>

              <Button type="submit"
                className="w-full h-12 rounded-2xl font-bold text-white border-0 mt-2 text-base"
                style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 4px 20px rgba(155,48,255,0.35)' }}
                disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : 'Log In'}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-white/35 mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-purple-400 font-semibold hover:text-purple-300">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}