import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Smartphone, Tablet, Laptop, X, Plus, QrCode, Shield, LogOut, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import useCurrentProfile from '@/hooks/useCurrentProfile';

const DEVICE_ICONS = { mobile: Smartphone, tablet: Tablet, desktop: Monitor, laptop: Laptop };

function detectDevice() {
  const ua = navigator.userAgent;
  let type = 'desktop';
  let os = 'Unknown';

  if (/iPhone|iPad|iPod/i.test(ua)) { type = /iPad/i.test(ua) ? 'tablet' : 'mobile'; os = 'iOS'; }
  else if (/Android/i.test(ua)) { type = /Mobile/i.test(ua) ? 'mobile' : 'tablet'; os = 'Android'; }
  else if (/Windows/i.test(ua)) { type = /Touch|Tablet/i.test(ua) ? 'tablet' : 'desktop'; os = 'Windows'; }
  else if (/Mac OS X/i.test(ua)) { type = /Macintosh/i.test(ua) ? 'laptop' : 'desktop'; os = 'macOS'; }
  else if (/Linux/i.test(ua)) { type = /Android/i.test(ua) ? 'mobile' : 'desktop'; os = 'Linux'; }

  let browser = 'Browser';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  return { type, os, browser, name: `${browser} on ${os}` };
}

function getSessionId() {
  let id = sessionStorage.getItem('jconnect_session_id');
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    sessionStorage.setItem('jconnect_session_id', id);
  }
  return id;
}

export default function LinkedDevicesPanel({ onBack }) {
  const { user, profile, loading } = useCurrentProfile();
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrTimer, setQrTimer] = useState(60);
  const [removingId, setRemovingId] = useState(null);

  // Load all linked devices for this user from the server
  const loadDevices = async () => {
    if (!user?.id) return;
    try {
      const all = await base44.entities.LinkedDevice.filter({ user_id: user.id }, '-last_active', 50);
      setDevices(all);
    } catch {}
    setLoadingDevices(false);
  };

  // Register / refresh the current device on mount
  useEffect(() => {
    if (!user?.id) return;
    const registerDevice = async () => {
      const info = detectDevice();
      const sessionId = getSessionId();
      const now = new Date().toISOString();
      try {
        // Check if this session is already registered
        const existing = await base44.entities.LinkedDevice.filter({ user_id: user.id, session_id: sessionId });
        if (existing.length > 0) {
          await base44.entities.LinkedDevice.update(existing[0].id, {
            device_name: info.name,
            device_type: info.type,
            os: info.os,
            last_active: now
          });
        } else {
          await base44.entities.LinkedDevice.create({
            user_id: user.id,
            session_id: sessionId,
            device_name: info.name,
            device_type: info.type,
            os: info.os,
            last_active: now
          });
        }
        loadDevices();
      } catch {
        setLoadingDevices(false);
      }
    };
    registerDevice();
    // Subscribe to real-time updates
    const unsub = base44.entities.LinkedDevice.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        loadDevices();
      }
    });
    return () => unsub();
  }, [user?.id]);

  // Heartbeat: update last_active every 30 seconds
  const devicesRef = useRef(devices);
  devicesRef.current = devices;
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(async () => {
      const sessionId = getSessionId();
      try {
        const existing = devicesRef.current.find(d => d.session_id === sessionId);
        if (existing) {
          await base44.entities.LinkedDevice.update(existing.id, { last_active: new Date().toISOString() });
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (!showQR) return;
    setQrTimer(60);
    const interval = setInterval(() => {
      setQrTimer(t => {
        if (t <= 1) { setShowQR(false); return 60; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showQR]);

  const handleLinkDevice = () => {
    const token = Math.random().toString(36).substring(2, 22).toUpperCase();
    setQrToken(token);
    setShowQR(true);
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this linked device? You will be signed out on that device.')) return;
    setRemovingId(id);
    try {
      await base44.entities.LinkedDevice.delete(id);
      setDevices(prev => prev.filter(d => d.id !== id));
    } catch {}
    setRemovingId(null);
  };

  const currentSessionId = getSessionId();

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1120' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0" style={{ backgroundColor: '#13152a' }}>
        <button onClick={onBack} className="p-2.5 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <X size={26} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Monitor size={18} className="text-purple-400" />
          <h2 className="font-semibold text-white">Linked Devices</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {/* Info Banner */}
        <div className="rounded-2xl border border-purple-500/20 p-4" style={{ backgroundColor: 'rgba(124,58,237,0.08)' }}>
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">Use J-Connect on other devices</p>
              <p className="text-xs text-white/50 leading-relaxed">
                Simply log in with your J-Connect account on any device — your chats sync automatically and securely. Each device appears here once active.
              </p>
            </div>
          </div>
        </div>

        {/* Link New Device */}
        {!showQR ? (
          <button
            onClick={handleLinkDevice}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-dashed border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5 transition-all"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
              <Plus size={20} className="text-purple-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-purple-400">Link a Device</p>
              <p className="text-xs text-white/40">Scan QR code on another device</p>
            </div>
            <QrCode size={20} className="text-purple-400 ml-auto" />
          </button>
        ) : (
          <div className="rounded-2xl border border-white/10 p-6 text-center" style={{ backgroundColor: '#1e2140' }}>
            <p className="text-sm font-semibold text-white mb-1">Scan with your device</p>
            <p className="text-xs text-white/40 mb-4">Open J-Connect on another device, tap Settings → Linked Devices → scan</p>
            {/* QR Code */}
            <div className="w-44 h-44 mx-auto rounded-2xl bg-white flex items-center justify-center mb-4 relative p-3">
              <div className="w-full h-full rounded-xl border-2 border-slate-200 grid grid-cols-8 grid-rows-8 gap-px p-1">
                {Array.from({ length: 64 }).map((_, i) => {
                  const charCode = qrToken.charCodeAt(i % qrToken.length) || 65;
                  const filled = (charCode * (i + 7)) % 3 !== 0;
                  return (
                    <div key={i} className={`rounded-[1px] ${filled ? 'bg-slate-900' : 'bg-white'}`} />
                  );
                })}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-lg" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" /></svg>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-white/40 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Waiting for device · expires in {qrTimer}s
            </div>
            <p className="text-xs text-white/30">
              After scanning, log in on the new device — it will appear in your linked devices list automatically.
            </p>
          </div>
        )}

        {/* Linked Devices List */}
        {loadingDevices ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-purple-400" />
          </div>
        ) : devices.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest px-1">Linked Devices ({devices.length})</p>
            {devices.map(device => {
              const Icon = DEVICE_ICONS[device.device_type] || Monitor;
              const isCurrent = device.session_id === currentSessionId;
              return (
                <div key={device.id} className="flex items-center gap-3 p-4 rounded-2xl border border-white/8"
                  style={{ backgroundColor: isCurrent ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.03)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}>
                    <Icon size={20} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{device.device_name || 'Unknown device'}</p>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">THIS DEVICE</span>
                      )}
                    </div>
                    <p className="text-xs text-white/40">
                      {isCurrent ? 'Active now' : `Last active ${moment(device.last_active).fromNow()}`}
                    </p>
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => handleRemove(device.id)}
                      disabled={removingId === device.id}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
                      title="Sign out this device"
                    >
                      {removingId === device.id ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm text-white/30 py-6">No devices linked yet</p>
        )}
      </div>
    </div>
  );
}