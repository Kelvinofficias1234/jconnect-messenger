import React, { useEffect, useState, useRef } from 'react';
import { Navigation } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MapPreview from './MapPreview';

export default function LocationMessage({ message, isOwn, currentUserId }) {
  const lat = message.location_lat;
  const lng = message.location_lng;
  const label = message.location_label;
  const isLive = message.is_live_location;
  const expiresAt = message.live_expires_at;

  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);
  const watchRef = useRef(null);

  // Countdown for live location
  useEffect(() => {
    if (!isLive || !expiresAt) return;
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) { setTimeLeft('Expired'); setExpired(true); return; }
      setExpired(false);
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m left` : m > 0 ? `${m}m ${s}s left` : `${s}s left`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isLive, expiresAt]);

  // Live tracking — only for the sender's own live messages, while not expired
  useEffect(() => {
    if (!isLive || !isOwn || !expiresAt || expired) return;
    if (!navigator.geolocation) return;
    let active = true;
    let lastUpdate = 0;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!active) return;
        const now = Date.now();
        if (new Date(expiresAt).getTime() <= now) {
          if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
          return;
        }
        if (now - lastUpdate < 15000) return; // throttle: update at most every 15s
        lastUpdate = now;
        base44.entities.Message.update(message.id, {
          location_lat: pos.coords.latitude,
          location_lng: pos.coords.longitude
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => {
      active = false;
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [isLive, isOwn, expiresAt, expired, message.id]);

  if (!lat || !lng) return null;

  const mapUrl = `https://maps.google.com/?q=${lat},${lng}`;

  return (
    <div onClick={() => window.open(mapUrl, '_blank')} className="block overflow-hidden rounded-xl cursor-pointer">
      <div className="relative w-[280px] h-[160px]" style={{ background: '#0d0f1e' }}>
        <MapPreview lat={lat} lng={lng} />
        {isLive && !expired && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(239,68,68,0.92)', zIndex: 1000 }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-bold text-white tracking-wide">LIVE</span>
          </div>
        )}
        {isLive && expired && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1000 }}>
            <span className="text-[10px] font-bold text-white/70 tracking-wide">EXPIRED</span>
          </div>
        )}
      </div>
      <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: isOwn ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.05)' }}>
        <Navigation size={14} className={isLive ? 'text-red-400 shrink-0' : 'text-purple-400 shrink-0'} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white/90 truncate">{label || (isLive ? 'Live Location' : 'Shared Location')}</p>
          <p className="text-[11px] text-white/40 truncate">
            {lat.toFixed(5)}, {lng.toFixed(5)}
            {isLive && timeLeft && <span className="text-red-400 ml-1.5">· {timeLeft}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}