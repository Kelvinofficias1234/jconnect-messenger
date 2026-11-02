import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Eye, EyeOff, MessageCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import GoogleIcon from "@/components/GoogleIcon";
import { trackInteraction } from "@/lib/analyticsWebhook";

export default function Register() {
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#9b30ff'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setStep('otp');
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      trackInteraction('register');
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    trackInteraction('register');
    base44.auth.loginWithProvider("google", "/");
  };

  const bgStyle = { background: 'linear-gradient(180deg, #0d0b1e 0%, #1a1040 50%, #0d0b1e 100%)' };
  const cardStyle = { backgroundColor: 'rgba(20,15,45,0.9)', backdropFilter: 'blur(20px)' };
  const btnStyle = { background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 4px 20px rgba(155,48,255,0.35)' };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex flex-col text-white" style={bgStyle}>
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(140,60,255,0.35) 0%, transparent 70%)' }} />
        </div>
        <div className="relative z-10 p-4">
          <button onClick={() => setStep('form')} className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-5 pb-10 relative z-10">
          <div className="w-full max-w-sm">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)', boxShadow: '0 0 40px rgba(155,48,255,0.4)' }}>
                <Mail className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Verify your email</h1>
              <p className="text-white/40 mt-1 text-sm">We sent a 6-digit code to</p>
              <p className="text-purple-300 font-semibold text-sm mt-0.5">{email}</p>
            </div>
            <div className="rounded-3xl border border-white/10 p-6 shadow-2xl" style={cardStyle}>
              {error && (
                <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
              )}
              <div className="flex justify-center mb-6">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button className="w-full h-12 rounded-2xl font-bold text-white border-0 text-base"
                style={btnStyle} onClick={handleVerify} disabled={loading || otpCode.length < 6}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : <><CheckCircle className="w-4 h-4 mr-2" />Verify & Continue</>}
              </Button>
              <p className="text-center text-sm text-white/40 mt-5">
                Didn't receive it?{" "}
                <button onClick={handleResend} className="text-purple-400 font-semibold hover:text-purple-300">Resend code</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-white" style={bgStyle}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(140,60,255,0.35) 0%, transparent 70%)' }} />
      </div>
      <div className="relative z-10 p-4">
        <Link to="/welcome" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
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
            <p className="text-white/40 text-sm">Create your free account</p>
          </div>

          <div className="rounded-3xl border border-white/10 p-6 shadow-2xl" style={cardStyle}>
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
                <span className="px-3 text-white/25 font-medium" style={{ backgroundColor: 'rgba(20,15,45,0.9)' }}>or register with email</span>
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
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/70" />
                  <Input type={showPass ? 'text' : 'password'} autoComplete="new-password" placeholder="Min. 8 characters"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 rounded-2xl border-white/10 text-white placeholder:text-white/20 focus-visible:ring-purple-500"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} required />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3].map(n => (
                        <div key={n} className="flex-1 h-1 rounded-full transition-all"
                          style={{ backgroundColor: n <= strength ? strengthColor[strength] : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strengthColor[strength] }}>{strengthLabel[strength]}</p>
                  </div>
                )}
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
              <Button type="submit"
                className="w-full h-12 rounded-2xl font-bold text-white border-0 mt-2 text-base"
                style={btnStyle} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : 'Create Account'}
              </Button>
            </form>

            <p className="text-center text-xs text-white/20 mt-5 leading-relaxed">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>

          <p className="text-center text-sm text-white/35 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-purple-400 font-semibold hover:text-purple-300">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}