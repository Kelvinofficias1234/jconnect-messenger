import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, MapPin, Locate, Loader2, Siren, Ambulance, Flame, Check, Phone, UserPlus, Shield, X, Search, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Avatar from './Avatar';
import { EMERGENCY_HOTLINES, getFlagEmoji, findCountryByName } from '@/lib/emergencyHotlines';
import { loadMyContacts } from '@/lib/contactManager';

const SERVICE_META = {
  police: { label: 'Police', icon: Siren, color: '#3B82F6' },
  ambulance: { label: 'Ambulance', icon: Ambulance, color: '#10B981' },
  fire: { label: 'Fire Fighters', icon: Flame, color: '#F59E0B' }
};

export default function EmergencyPanel({ currentUserId, currentProfile, onBack, onProfileUpdated }) {
  const [country, setCountry] = useState(null);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [sending, setSending] = useState(null);
  const [lastAlert, setLastAlert] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [emergencyContactId, setEmergencyContactId] = useState(currentProfile?.emergency_contact_id || '');
  const [emergencyContactName, setEmergencyContactName] = useState(currentProfile?.emergency_contact_name || '');
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Privacy: Load only established contacts — never the global user directory
        const profs = await loadMyContacts(currentUserId);
        setAllProfiles(profs);
      } catch {}
      detectLocation();
    })();
  }, [currentUserId]);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setCoords({ latitude, longitude });
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          { headers: { 'Accept': 'application/json' } }
        );
        const data = await res.json();
        const c = data?.address?.country;
        if (c) {
          setLocationName(c);
          const match = findCountryByName(c);
          if (match) setCountry(match);
        }
      } catch {}
      setLocating(false);
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 10000 });
  };

  // Default to first country if none detected
  useEffect(() => {
    if (!country && EMERGENCY_HOTLINES.length > 0) {
      // Try to detect locale-based country
      const locale = navigator.language || 'en-US';
      const localeCode = locale.split('-')[1];
      if (localeCode) {
        const match = EMERGENCY_HOTLINES.find(c => c.iso2 === localeCode.toUpperCase());
        if (match) { setCountry(match); return; }
      }
      // Default to Rwanda (app origin)
      setCountry(EMERGENCY_HOTLINES.find(c => c.iso2 === 'RW') || EMERGENCY_HOTLINES[0]);
    }
  }, [country]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return EMERGENCY_HOTLINES;
    const q = countrySearch.toLowerCase();
    return EMERGENCY_HOTLINES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.iso2.toLowerCase().includes(q) ||
      c.dialCode.includes(q)
    );
  }, [countrySearch]);

  const buildAlertText = (myName, serviceLabel, lat, lng) => {
    const locText = lat != null ? `📍 Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : '';
    const mapsLink = lat != null ? `https://maps.google.com/?q=${lat},${lng}` : '';
    const labelPart = serviceLabel ? ` for ${serviceLabel}` : '';
    return `🚨 EMERGENCY ALERT\n${myName} has triggered an emergency alert${labelPart} and may need urgent help.\n${locText}${mapsLink ? `\n🌐 ${mapsLink}` : ''}\n\nPlease check on them immediately.`;
  };

  const sendContactMessage = async (alertText) => {
    if (!emergencyContactId) return;
    try {
      const convos = await base44.entities.Conversation.list('-created_date', 200);
      let convo = convos.find(c =>
        c.type === 'direct' &&
        c.participant_ids?.includes(currentUserId) &&
        c.participant_ids?.includes(emergencyContactId)
      );
      if (!convo) {
        convo = await base44.entities.Conversation.create({
          type: 'direct',
          participant_ids: [currentUserId, emergencyContactId],
          last_message_text: '',
          last_message_time: new Date().toISOString()
        });
      }
      await base44.entities.Message.create({
        conversation_id: convo.id,
        sender_id: currentUserId,
        text: alertText,
        message_type: 'text'
      });
      await base44.entities.Conversation.update(convo.id, {
        last_message_text: '🚨 Emergency Alert',
        last_message_time: new Date().toISOString(),
        last_message_sender_id: currentUserId
      });
    } catch {}
  };

  const notifyEmergencyContact = async (service, lat, lng) => {
    const myName = currentProfile?.display_name || 'A J-Connect user';
    await sendContactMessage(buildAlertText(myName, SERVICE_META[service].label, lat, lng));
  };

  const handleEmergency = async (service) => {
    if (!country) return;
    const number = country[service];
    if (!number) return;
    setSending(service);
    let lat = coords?.latitude;
    let lng = coords?.longitude;
    if (lat == null && navigator.geolocation) {
      try {
        const p = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 })
        );
        lat = p.coords.latitude;
        lng = p.coords.longitude;
        setCoords({ latitude: lat, longitude: lng });
      } catch {}
    }
    try {
      await base44.entities.EmergencyAlert.create({
        user_id: currentUserId,
        service_type: service,
        country: country.name,
        phone_number: number,
        latitude: lat || 0,
        longitude: lng || 0,
        location_shared: lat != null
      });
    } catch {}
    notifyEmergencyContact(service, lat, lng);
    setSending(null);
    setLastAlert({ service, number, lat, lng, country: country.name });
    window.location.href = `tel:${number}`;
  };

  const handleSendAlertToContact = async () => {
    if (!emergencyContactId) {
      setShowContactPicker(true);
      return;
    }
    if (!confirm(`Send an emergency alert with your live location to ${emergencyContactName || 'your contact'}?`)) return;
    setSending('contact');
    let lat = coords?.latitude;
    let lng = coords?.longitude;
    if (lat == null && navigator.geolocation) {
      try {
        const p = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 })
        );
        lat = p.coords.latitude;
        lng = p.coords.longitude;
        setCoords({ latitude: lat, longitude: lng });
      } catch {}
    }
    const myName = currentProfile?.display_name || 'A J-Connect user';
    await sendContactMessage(buildAlertText(myName, '', lat, lng));
    setSending(null);
    setLastAlert({ service: 'contact', number: '', lat, lng, country: locationName || '' });
  };

  const handleSetContact = async (profile) => {
    setSavingContact(true);
    try {
      await base44.entities.Profile.update(currentProfile.id, {
        emergency_contact_id: profile.user_id,
        emergency_contact_name: profile.display_name
      });
      setEmergencyContactId(profile.user_id);
      setEmergencyContactName(profile.display_name);
      setShowContactPicker(false);
      onProfileUpdated?.();
    } catch {}
    setSavingContact(false);
  };

  const handleClearContact = async () => {
    if (!confirm('Remove your emergency contact?')) return;
    setSavingContact(true);
    try {
      await base44.entities.Profile.update(currentProfile.id, {
        emergency_contact_id: '',
        emergency_contact_name: ''
      });
      setEmergencyContactId('');
      setEmergencyContactName('');
      onProfileUpdated?.();
    } catch {}
    setSavingContact(false);
  };

  const filteredContacts = allProfiles.filter(p =>
    p.user_id !== currentUserId &&
    (p.display_name || '').toLowerCase().includes(contactSearch.toLowerCase())
  );

  const emergencyContactProfile = allProfiles.find(p => p.user_id === emergencyContactId);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#120024' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0" style={{ backgroundColor: '#1A0B2E' }}>
        <button onClick={onBack} className="p-2.5 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={26} />
        </button>
        <h2 className="font-semibold text-white flex-1">Emergency</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-5">
        {/* Emergency Contact Nomination */}
        <div className="rounded-2xl border border-red-500/20 p-4 space-y-3" style={{ backgroundColor: '#2A164B' }}>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-red-400" />
            <p className="text-sm font-semibold text-white/80">Emergency Contact</p>
          </div>
          {emergencyContactId && emergencyContactProfile ? (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
              <Avatar src={emergencyContactProfile.avatar_url} name={emergencyContactProfile.display_name} size="sm" isOnline={emergencyContactProfile.is_online} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{emergencyContactProfile.display_name}</p>
                <p className="text-xs text-white/40 truncate">Will be notified instantly on emergency</p>
              </div>
              <button onClick={handleClearContact} disabled={savingContact}
                className="text-xs text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                {savingContact ? '...' : 'Remove'}
              </button>
            </div>
          ) : emergencyContactId && emergencyContactName ? (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.2)' }}>
                <Shield size={16} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{emergencyContactName}</p>
                <p className="text-xs text-white/40 truncate">Will be notified instantly on emergency</p>
              </div>
              <button onClick={handleClearContact} disabled={savingContact}
                className="text-xs text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                {savingContact ? '...' : 'Remove'}
              </button>
            </div>
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: '#B3A5C8' }}>
              Nominate a trusted J-Connect contact. They'll receive an instant alert with your live location when you trigger an emergency.
            </p>
          )}
          {!emergencyContactId && (
            <button onClick={() => setShowContactPicker(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: 'linear-gradient(135deg,#9b30ff,#6b21d6)' }}>
              <UserPlus size={16} /> Nominate Emergency Contact
            </button>
          )}
          {emergencyContactId && (
            <button onClick={() => setShowContactPicker(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors">
              Change contact
            </button>
          )}
        </div>

        {/* Direct SOS to contact */}
        <button onClick={handleSendAlertToContact} disabled={sending === 'contact'}
          className="w-full flex items-center gap-4 px-4 py-5 rounded-2xl border transition-all disabled:opacity-60"
          style={{ backgroundColor: sending === 'contact' ? '#7f1d1d' : '#dc2626', borderColor: '#fca5a5' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
            {sending === 'contact'
              ? <Loader2 size={24} className="animate-spin text-white" />
              : <Siren size={24} className="text-white" />}
          </div>
          <div className="flex-1 text-left">
            <p className="text-base font-bold text-white">
              {sending === 'contact' ? 'Sending Alert…' : 'Send Emergency Alert'}
            </p>
            <p className="text-xs text-white/80">
              {emergencyContactId
                ? `Notify ${emergencyContactName || 'your contact'} with your live location instantly`
                : 'Tap to nominate a contact first'}
            </p>
          </div>
        </button>

        {/* Location card */}
        <div className="rounded-2xl border border-red-500/20 p-4 space-y-3" style={{ backgroundColor: '#2A164B' }}>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-red-400" />
            <p className="text-sm font-semibold text-white/80">Your Location</p>
          </div>
          <button onClick={detectLocation}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg,#9b30ff,#6b21d6)' }}>
            {locating ? <Loader2 size={16} className="animate-spin" /> : <Locate size={16} />}
            {locating ? 'Detecting location…' : 'Detect my location'}
          </button>
          {coords && (
            <div className="text-xs space-y-1" style={{ color: '#B3A5C8' }}>
              {locationName && <p>📍 {locationName}</p>}
              <p>Latitude: {coords.latitude.toFixed(5)}, Longitude: {coords.longitude.toFixed(5)}</p>
            </div>
          )}
          {!coords && !locating && (
            <p className="text-xs" style={{ color: '#B3A5C8' }}>
              Tap to share your real-time location with emergency services.
            </p>
          )}
        </div>

        {/* Country selector with flag */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#B3A5C8' }}>
            Select your country
          </label>
          <button onClick={() => setShowCountryPicker(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white focus:outline-none border border-white/10 transition-colors hover:bg-white/5"
            style={{ backgroundColor: '#2A164B' }}>
            {country && (
              <span className="text-2xl leading-none">{getFlagEmoji(country.iso2)}</span>
            )}
            <span className="flex-1 text-left font-medium">
              {country ? country.name : 'Select country...'}
            </span>
            {country && (
              <span className="text-xs text-purple-400 font-medium">{country.dialCode}</span>
            )}
            <ChevronDown size={18} className="text-white/40" />
          </button>
        </div>

        {/* Service buttons */}
        <div className="space-y-3">
          {['police', 'ambulance', 'fire'].map(svc => {
            const meta = SERVICE_META[svc];
            const Icon = meta.icon;
            const number = country ? country[svc] : null;
            return (
              <button key={svc} onClick={() => handleEmergency(svc)} disabled={!number || sending === svc}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all disabled:opacity-40"
                style={{ backgroundColor: '#2A164B', borderColor: meta.color + '40' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: meta.color + '20' }}>
                  {sending === svc
                    ? <Loader2 size={22} className="animate-spin" style={{ color: meta.color }} />
                    : <Icon size={22} style={{ color: meta.color }} />}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{meta.label}</p>
                  <p className="text-xs" style={{ color: '#B3A5C8' }}>
                    {number ? `Call ${number}` : 'Not available'}
                  </p>
                </div>
                <Phone size={18} style={{ color: meta.color }} />
              </button>
            );
          })}
        </div>

        {/* Confirmation */}
        {lastAlert && (
          <div className="rounded-2xl border border-green-500/30 p-4 space-y-2" style={{ backgroundColor: '#2A164B' }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
              <p className="text-sm font-semibold text-white">Alert sent</p>
            </div>
            <p className="text-xs" style={{ color: '#B3A5C8' }}>
              {lastAlert.service === 'contact'
                ? `Emergency alert sent to ${emergencyContactName || 'your contact'}`
                : `${SERVICE_META[lastAlert.service].label} · ${lastAlert.number} in ${lastAlert.country}`}
            </p>
            {lastAlert.lat != null && (
              <p className="text-xs" style={{ color: '#B3A5C8' }}>
                Live location shared: {lastAlert.lat.toFixed(5)}, {lastAlert.lng.toFixed(5)}
              </p>
            )}
            {emergencyContactId && (
              <p className="text-xs text-purple-400">
                ✓ {emergencyContactName || 'Your emergency contact'} has been notified in J-Connect
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-center pt-2" style={{ color: '#B3A5C8' }}>
          {EMERGENCY_HOTLINES.length} countries available · Hotline numbers update automatically based on the selected country.
        </p>
      </div>

      {/* Country Picker Modal */}
      {showCountryPicker && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#0d0b1e' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0" style={{ backgroundColor: '#1A0B2E' }}>
            <button onClick={() => setShowCountryPicker(false)} className="text-white/70 hover:text-white">
              <X size={22} />
            </button>
            <h2 className="font-semibold text-white flex-1">Select Country</h2>
            <span className="text-xs text-white/40">{EMERGENCY_HOTLINES.length} countries</span>
          </div>
          <div className="px-4 py-3 border-b border-white/5 shrink-0" style={{ backgroundColor: '#1A0B2E' }}>
            <div className="flex items-center gap-2 rounded-full px-3 py-2 border border-white/10" style={{ backgroundColor: '#2A164B' }}>
              <Search size={16} className="text-white/40" />
              <input autoFocus value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                placeholder="Search country or code..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none" />
              {countrySearch && (
                <button onClick={() => setCountrySearch('')} className="text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {filteredCountries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <p className="text-white/50 text-sm">No countries found</p>
              </div>
            ) : (
              filteredCountries.map(c => (
                <button key={c.iso2} onClick={() => { setCountry(c); setShowCountryPicker(false); setCountrySearch(''); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  style={{ backgroundColor: country?.iso2 === c.iso2 ? 'rgba(124,58,237,0.1)' : 'transparent' }}>
                  <span className="text-2xl leading-none shrink-0">{getFlagEmoji(c.iso2)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    <p className="text-xs text-white/35 truncate">{c.dialCode} · Police {c.police} · Ambulance {c.ambulance} · Fire {c.fire}</p>
                  </div>
                  {country?.iso2 === c.iso2 && <Check size={18} className="text-purple-400 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Contact Picker Modal */}
      {showContactPicker && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#0d0b1e' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0" style={{ backgroundColor: '#1A0B2E' }}>
            <button onClick={() => setShowContactPicker(false)} className="text-white/70 hover:text-white">
              <X size={22} />
            </button>
            <h2 className="font-semibold text-white flex-1">Choose Emergency Contact</h2>
          </div>
          <div className="px-4 py-3 border-b border-white/5 shrink-0" style={{ backgroundColor: '#1A0B2E' }}>
            <div className="flex items-center gap-2 rounded-full px-3 py-2 border border-white/10" style={{ backgroundColor: '#2A164B' }}>
              <Search size={16} className="text-white/40" />
              <input autoFocus value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                placeholder="Search J-Connect contacts..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(124,58,237,0.12)' }}>
                  <Search size={28} className="text-purple-500/50" />
                </div>
                <p className="text-white/50 text-sm">No contacts found</p>
              </div>
            ) : (
              filteredContacts.map(p => (
                <button key={p.id} onClick={() => handleSetContact(p)} disabled={savingContact}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                  <Avatar src={p.avatar_url} name={p.display_name} size="md" isOnline={p.is_online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.display_name}</p>
                    <p className="text-xs text-white/35 truncate">{p.status_message || 'Available'}</p>
                  </div>
                  {emergencyContactId === p.user_id && <Check size={18} className="text-purple-400 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}