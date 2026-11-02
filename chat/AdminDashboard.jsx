import React, { useState } from 'react';
import { ArrowLeft, BadgeCheck, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Admin Dashboard — Privacy-hardened.
 *
 * No global user/conversation/message lists are fetched. The only data
 * operation is an EXACT-MATCH lookup by phone number or email to grant
 * or remove the Meta Verified badge. Admins cannot browse the user base,
 * read conversations, or view messages.
 */
export default function AdminDashboard({ onBack }) {
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGrantVerified = async (grant) => {
    if (!verifyInput.trim()) return;
    const identifier = verifyInput.trim();
    setLoading(true);
    setVerifyMsg('');
    try {
      let target = null;

      // Exact phone number match
      const phoneMatches = await base44.entities.Profile.filter({
        phone_number: identifier.replace(/\s/g, '')
      });
      target = phoneMatches[0] || null;

      // If not found and looks like an email, exact email match via User entity
      if (!target && identifier.includes('@')) {
        const userMatches = await base44.entities.User.filter({
          email: identifier.toLowerCase()
        });
        if (userMatches.length > 0) {
          const profileMatches = await base44.entities.Profile.filter({
            user_id: userMatches[0].id
          });
          target = profileMatches[0] || null;
        }
      }

      if (!target) {
        setVerifyMsg(`❌ No user found with "${identifier}". Try their exact phone number or email.`);
        setLoading(false);
        return;
      }

      await base44.entities.Profile.update(target.id, { is_meta_verified: grant });
      setVerifyMsg(`✅ ${grant ? 'Granted' : 'Removed'} Meta Verified badge ${grant ? 'to' : 'from'} ${target.display_name}.`);
      setVerifyInput('');
    } catch (e) {
      setVerifyMsg(`❌ Error: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1120' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0" style={{ backgroundColor: '#13152a' }}>
        <button onClick={onBack} className="text-white/80 hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <Shield size={18} className="text-purple-400" />
        <h2 className="font-bold text-white flex-1">Admin Dashboard</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
        {/* Grant Verified Badge — exact match only */}
        <div className="rounded-2xl border border-purple-500/20 p-4 space-y-3" style={{ backgroundColor: 'rgba(124,58,237,0.05)' }}>
          <div className="flex items-center gap-2">
            <BadgeCheck size={18} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Meta Verified Badge</h3>
          </div>
          <p className="text-xs text-white/40">Enter a user's exact phone number or email to grant or remove the verified badge.</p>
          <div className="flex gap-2">
            <input value={verifyInput} onChange={e => setVerifyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleGrantVerified(true); }}
              placeholder="+250788123456 or user@email.com"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none border border-white/10"
              style={{ backgroundColor: '#1e2140' }} />
            <button onClick={() => handleGrantVerified(true)} disabled={!verifyInput.trim() || loading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #1877F2, #0a5bc4)' }}>
              Grant
            </button>
            <button onClick={() => handleGrantVerified(false)} disabled={!verifyInput.trim() || loading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white/80 bg-white/5 disabled:opacity-40 hover:bg-white/10">
              Remove
            </button>
          </div>
          {verifyMsg && <p className="text-xs text-white/60">{verifyMsg}</p>}
        </div>

        <div className="rounded-2xl border border-white/8 p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <p className="text-xs text-white/40 leading-relaxed text-center">
            🔒 For privacy, the admin dashboard no longer displays user lists, conversations, or messages.
            Only exact-match phone/email lookups for badge management are available.
          </p>
        </div>
      </div>
    </div>
  );
}