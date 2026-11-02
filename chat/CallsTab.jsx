import React, { useState, useEffect } from 'react';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCall } from './CallProvider';
import Avatar from './Avatar';
import moment from 'moment';

export default function CallsTab({ currentUserId, allProfiles }) {
  const { startCall } = useCall();
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContactPicker, setShowContactPicker] = useState(null); // 'voice' | 'video' | null

  const profileMap = {};
  (allProfiles || []).forEach(p => { profileMap[p.user_id] = p; });

  const loadLogs = async () => {
    try {
      const all = await base44.entities.CallLog.list('-created_date', 100);
      setCallLogs(all.filter(c => c.participants?.includes(currentUserId)));
    } catch (e) {
      setCallLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [currentUserId]);

  const handleCall = (targetUserId, callType) => {
    setShowContactPicker(null);
    startCall(targetUserId, callType);
  };

  const getOtherUserId = (log) => {
    return log.caller_id === currentUserId ? log.callee_id : log.caller_id;
  };

  const getCallIcon = (log) => {
    const isMissed = log.status === 'missed';
    if (log.direction === 'incoming' || log.caller_id !== currentUserId) {
      return isMissed
        ? <PhoneMissed size={14} className="text-red-400" />
        : <PhoneIncoming size={14} className="text-green-400" />;
    }
    return <PhoneOutgoing size={14} className="text-green-400" />;
  };

  const getCallLabel = (log) => {
    const isMine = log.caller_id === currentUserId;
    if (log.status === 'missed') return 'Missed';
    return isMine ? 'Outgoing' : 'Incoming';
  };

  const otherProfiles = (allProfiles || []).filter(p => p.user_id !== currentUserId);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ backgroundColor: '#120024' }}>
      {/* Quick call buttons */}
      <div className="flex gap-3 px-4 py-4 border-b border-white/5">
        <button
          onClick={() => setShowContactPicker('voice')}
          className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-2xl font-semibold text-sm transition-colors"
          style={{ backgroundColor: '#2A164B', color: '#B258FF' }}>
          <Phone size={18} style={{ color: '#B258FF' }} />
          Voice Call
        </button>
        <button
          onClick={() => setShowContactPicker('video')}
          className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-2xl font-semibold text-sm transition-colors"
          style={{ backgroundColor: '#2A164B', color: '#B258FF' }}>
          <Video size={18} style={{ color: '#B258FF' }} />
          Video Call
        </button>
      </div>

      {/* Section label */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#B3A5C8' }}>Recent</p>
      </div>

      {/* Call Logs */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : callLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: '#2A164B' }}>
            <Phone size={28} style={{ color: '#B258FF' }} />
          </div>
          <p className="text-sm font-semibold text-white/60 mb-1">No recent calls</p>
          <p className="text-xs" style={{ color: '#B3A5C8' }}>Your recent calls will appear here</p>
        </div>
      ) : (
        <div>
          {callLogs.map(log => {
            const otherId = getOtherUserId(log);
            const prof = profileMap[otherId];
            return (
              <div key={log.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/5"
                style={{ backgroundColor: '#2A164B' + '20' }}>
                <Avatar src={prof?.avatar_url} name={prof?.display_name || 'Unknown'} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{prof?.display_name || 'Unknown'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {getCallIcon(log)}
                    <span className="text-xs" style={{ color: log.status === 'missed' ? '#f87171' : '#B3A5C8' }}>
                      {getCallLabel(log)} · {moment(log.created_date).calendar(null, {
                        sameDay: '[Today,] h:mm A',
                        lastDay: '[Yesterday,] h:mm A',
                        lastWeek: 'ddd, h:mm A',
                        sameElse: 'MMM D, h:mm A'
                      })}
                    </span>
                  </div>
                </div>
                {/* Redial button */}
                <button
                  onClick={() => handleCall(otherId, log.call_type)}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
                  style={{ backgroundColor: '#2A164B' }}>
                  {log.call_type === 'video'
                    ? <Video size={17} style={{ color: '#B258FF' }} />
                    : <Phone size={17} style={{ color: '#B258FF' }} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact Picker Modal */}
      {showContactPicker && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowContactPicker(null)}>
          <div className="rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md flex flex-col overflow-hidden shadow-2xl border border-purple-900/40"
            style={{ backgroundColor: '#120024', maxHeight: '75vh' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
              {showContactPicker === 'voice'
                ? <Phone size={18} style={{ color: '#B258FF' }} />
                : <Video size={18} style={{ color: '#B258FF' }} />}
              <h3 className="font-semibold text-white">
                {showContactPicker === 'voice' ? 'Voice Call' : 'Video Call'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {otherProfiles.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: '#B3A5C8' }}>No contacts found</p>
              ) : (
                otherProfiles.map(p => (
                  <button key={p.id}
                    onClick={() => handleCall(p.user_id, showContactPicker)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 transition-colors"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1A0B2E'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Avatar src={p.avatar_url} name={p.display_name} size="md" isOnline={p.is_online} />
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.display_name}</p>
                      <p className="text-xs truncate" style={{ color: '#B3A5C8' }}>
                        {p.status_message || 'Hey there! I am using J-Connect.'}
                      </p>
                    </div>
                    {showContactPicker === 'voice'
                      ? <Phone size={16} style={{ color: '#B258FF' }} />
                      : <Video size={16} style={{ color: '#B258FF' }} />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}