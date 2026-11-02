import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, X, Navigation, Radio, Clock, Crosshair } from 'lucide-react';

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:36px;height:42px;">
    <div style="position:absolute;top:0;left:4px;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#7c3aed,#4f46e5);border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.5);"></div>
    <div style="position:absolute;top:8px;left:12px;width:12px;height:12px;border-radius:50%;background:#fff;"></div>
  </div>`,
  iconSize: [36, 42],
  iconAnchor: [18, 40],
});

function Recenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView([coords.lat, coords.lng], map.getZoom() || 16);
  }, [coords?.lat, coords?.lng]);
  return null;
}

const DURATIONS = [
  { mins: 15, label: '15 min' },
  { mins: 60, label: '1 hour' },
  { mins: 480, label: '8 hours' },
];

export default function LocationPicker({ onSend, onCancel }) {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [label, setLabel] = useState('');
  const [showLive, setShowLive] = useState(false);

  const getLocation = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => {
        setError('Location permission denied. Please enable location access.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  useEffect(() => { getLocation(); }, []);

  const sendCurrent = () => {
    if (!coords) return;
    onSend({ lat: coords.lat, lng: coords.lng, label: label.trim() || 'Current Location', isLive: false });
  };

  const sendLive = (mins) => {
    if (!coords) return;
    onSend({ lat: coords.lat, lng: coords.lng, label: label.trim() || 'Live Location', isLive: true, durationMinutes: mins });
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col" style={{ backgroundColor: '#0d0f1e' }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 border-b border-white/10" style={{ backgroundColor: '#13152a' }}>
        <button onClick={onCancel} className="p-2 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <X size={22} />
        </button>
        <h2 className="text-white font-semibold text-base flex-1">Share Location</h2>
      </div>

      <div className="flex-1 relative" style={{ backgroundColor: '#0d0f1e' }}>
        {coords && (
          <MapContainer
            center={[coords.lat, coords.lng]}
            zoom={16}
            zoomControl={false}
            style={{ width: '100%', height: '100%', background: '#0d0f1e' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            <Marker position={[coords.lat, coords.lng]} icon={pinIcon} />
            <Recenter coords={coords} />
          </MapContainer>
        )}

        {!coords && !loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <MapPin size={40} className="text-purple-500" style={{ transform: 'translateY(-16px)' }} />
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: 'rgba(13,15,30,0.85)' }}>
            <div className="w-7 h-7 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-sm text-white/60">Detecting your location…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6" style={{ backgroundColor: 'rgba(13,15,30,0.95)' }}>
            <MapPin size={40} className="text-red-400" />
            <p className="text-sm text-red-400 text-center">{error}</p>
            <button onClick={getLocation}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              <Crosshair size={16} /> Try again
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 pb-5" style={{ backgroundColor: '#13152a' }}>
        <div className="p-4 space-y-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Add a label (e.g. Home, Office)…"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
          />

          <button
            onClick={() => setShowLive((s) => !s)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
            style={{
              backgroundColor: showLive ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
              borderColor: showLive ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'
            }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.2)' }}>
              <Radio size={18} className="text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">Share Live Location</p>
              <p className="text-[11px] text-white/40">Share your real-time movement for a set duration</p>
            </div>
          </button>

          {showLive && (
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.mins}
                  onClick={() => sendLive(d.mins)}
                  disabled={!coords}
                  className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl border border-white/10 text-white/80 hover:bg-white/8 transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <Clock size={18} className="text-red-400" />
                  <span className="text-xs font-medium">{d.label}</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={sendCurrent}
            disabled={!coords}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            <Navigation size={18} /> Send your current location
          </button>
        </div>
      </div>
    </div>
  );
}