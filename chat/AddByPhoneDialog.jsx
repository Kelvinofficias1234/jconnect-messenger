import React, { useState } from 'react';
import { ArrowLeft, Phone, UserPlus, Info, Copy, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import PhoneInput from '@/components/PhoneInput';

export default function AddByPhoneDialog({ currentUserId, onSelect, onClose }) {
  const [fullNumber, setFullNumber] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSearch = async () => {
    if (!fullNumber || !phoneValid) return;
    setSearching(true);
    setSearched(false);
    try {
      const matches = await base44.entities.Profile.filter({
        phone_number: fullNumber
      });
      const match = matches.find(p => p.user_id !== currentUserId) || null;
      setResult(match);
    } catch {
      setResult(null);
    }
    setSearching(false);
    setSearched(true);
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/register`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md flex flex-col overflow-hidden shadow-2xl border border-purple-900/40"
        style={{ backgroundColor: '#120024', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
          <button onClick={onClose} className="text-white/60 hover:text-white"><ArrowLeft size={20} /></button>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Add by Phone Number</h3>
            <p className="text-xs text-white/40">Add a contact with their country code</p>
          </div>
          <UserPlus size={18} className="text-purple-400" />
        </div>

        <div className="p-4 space-y-3 border-b border-white/5">
          <PhoneInput
            value={fullNumber}
            onChange={(num, valid) => { setFullNumber(num); setPhoneValid(valid); }}
            placeholder="788 123 456"
            error={!!fullNumber && !phoneValid}
          />
          {fullNumber && !phoneValid && (
            <p className="text-xs text-red-400">Invalid number for the selected country</p>
          )}
          <button onClick={handleSearch} disabled={!fullNumber || !phoneValid || searching}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#9b30ff,#6b21d6)' }}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
          {!searched && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Info size={28} className="text-white/30 mb-3" />
              <p className="text-sm text-white/50">Enter a phone number with country code to find a contact on J-Connect.</p>
            </div>
          )}
          {searched && result && (
            <button onClick={() => onSelect(result)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 transition-colors border border-white/10"
              style={{ backgroundColor: '#2A164B' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}>
                <Phone size={18} className="text-purple-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-white truncate">{result.display_name}</p>
                <p className="text-xs text-white/40 truncate">{result.phone_number || 'On J-Connect'}</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg,#9b30ff,#6b21d6)' }}>Chat</span>
            </button>
          )}
          {searched && !result && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#2A164B' }}>
                <Phone size={24} className="text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">{fullNumber} isn't on J-Connect</p>
              <p className="text-xs text-white/40 mb-4 max-w-[240px]">Invite them to join so you can start chatting.</p>
              <button onClick={handleCopyInvite}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#9b30ff,#6b21d6)' }}>
                {copied ? <><Check size={14} /> Link copied</> : <><Copy size={14} /> Copy invite link</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}