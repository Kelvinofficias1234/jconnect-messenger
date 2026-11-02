import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AsYouType, getCountries, getCountryCallingCode, isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { ChevronDown, Search, Check, X } from 'lucide-react';

// ── Helpers ──
const flagEmoji = (iso2) => {
  if (!iso2 || iso2.length !== 2) return '🌐';
  return String.fromCodePoint(...[...iso2.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
};

let regionNames;
try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { regionNames = null; }
const countryNameOf = (iso2) => {
  try { return regionNames?.of(iso2) || iso2; } catch { return iso2; }
};

// Build the full 217+ country list once at module load
const ALL_COUNTRIES = getCountries().map(iso2 => ({
  iso2,
  name: countryNameOf(iso2),
  code: '+' + getCountryCallingCode(iso2),
  flag: flagEmoji(iso2),
})).sort((a, b) => a.name.localeCompare(b.name));

// Auto-detect user's country from locale
const detectCountry = () => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || navigator.language || '';
    const region = locale.split('-')[1];
    if (region && region.length === 2) {
      const upper = region.toUpperCase();
      if (getCountries().includes(upper)) return upper;
    }
  } catch {}
  return 'US';
};

// Parse an initial international value into country + formatted national number
const parseInitial = (value) => {
  if (!value) return { country: null, national: '' };
  try {
    const parsed = parsePhoneNumber(value);
    if (parsed?.country) return { country: parsed.country, national: parsed.formatNational() };
  } catch {}
  return { country: null, national: value };
};

export default function PhoneInput({ value, onChange, placeholder = 'Phone Number', error = false, autoFocus = false }) {
  const initial = useMemo(() => parseInitial(value), []);
  const [country, setCountry] = useState(initial.country || detectCountry());
  const [localNumber, setLocalNumber] = useState(initial.national);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const lastEmittedRef = useRef(value || '');

  // Filtered list based on search query (name or code)
  const filtered = useMemo(() => {
    if (!search) return ALL_COUNTRIES;
    const q = search.toLowerCase().replace(/\+/g, '');
    return ALL_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) || c.code.replace('+', '').includes(q)
    );
  }, [search]);

  // Build the full international number
  const fullNumber = useMemo(() => {
    const digits = localNumber.replace(/\D/g, '');
    if (!digits) return '';
    try { return '+' + getCountryCallingCode(country) + digits; } catch { return ''; }
  }, [country, localNumber]);

  const isValid = useMemo(() => {
    if (!fullNumber) return false;
    try { return isValidPhoneNumber(fullNumber); } catch { return false; }
  }, [fullNumber]);

  // Emit changes to parent
  useEffect(() => {
    if (fullNumber !== lastEmittedRef.current) {
      lastEmittedRef.current = fullNumber;
      onChange?.(fullNumber, isValid);
    }
  }, [fullNumber, isValid, onChange]);

  // Sync from external value changes (e.g. reset / clear)
  useEffect(() => {
    if (value !== undefined && value !== lastEmittedRef.current) {
      const parsed = parseInitial(value);
      if (parsed.country) setCountry(parsed.country);
      setLocalNumber(parsed.national);
      lastEmittedRef.current = value || '';
    }
  }, [value]);

  const handleNumberChange = (e) => {
    const raw = e.target.value;
    try {
      const formatter = new AsYouType(country);
      setLocalNumber(formatter.input(raw));
    } catch {
      setLocalNumber(raw);
    }
  };

  const handleCountrySelect = (iso2) => {
    setCountry(iso2);
    setShowDropdown(false);
    setSearch('');
    // Reformat existing digits for the new country
    const digits = localNumber.replace(/\D/g, '');
    if (digits) {
      try { setLocalNumber(new AsYouType(iso2).input(digits)); } catch {}
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  useEffect(() => {
    if (showDropdown) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showDropdown]);

  const borderColor = error ? '#ef4444' : 'rgba(255,255,255,0.1)';

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-stretch rounded-xl overflow-hidden border" style={{ backgroundColor: '#2A164B', borderColor }}>
        {/* Country selector button: flag + code + chevron */}
        <button type="button" onClick={() => setShowDropdown(s => !s)}
          className="flex items-center gap-1.5 pl-3 pr-2 py-2.5 text-sm text-white hover:bg-white/5 transition-colors border-r border-white/10 shrink-0">
          <span className="text-lg leading-none">{flagEmoji(country)}</span>
          <span className="font-medium whitespace-nowrap">{'+' + getCountryCallingCode(country)}</span>
          <ChevronDown size={14} className="text-white/40" />
        </button>
        {/* Phone number input */}
        <input
          type="tel"
          inputMode="tel"
          autoFocus={autoFocus}
          value={localNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2.5 text-sm text-white placeholder:text-white/35 bg-transparent focus:outline-none"
        />
      </div>

      {/* Country dropdown with search */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[300] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          style={{ backgroundColor: '#1a1133', maxHeight: '320px' }}>
          <div className="p-2 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: '#2A164B' }}>
              <Search size={15} className="text-white/40 shrink-0" />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search country or code…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none" />
              {search && (
                <button onClick={() => setSearch('')} className="text-white/30 hover:text-white shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {filtered.map(c => (
              <button key={c.iso2} type="button" onClick={() => handleCountrySelect(c.iso2)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
                <span className="text-xl leading-none shrink-0">{c.flag}</span>
                <span className="flex-1 text-sm text-white truncate">{c.name}</span>
                <span className="text-sm text-white/50 shrink-0">{c.code}</span>
                {c.iso2 === country && <Check size={16} className="text-purple-400 shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-white/40 text-center py-6">No countries found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}