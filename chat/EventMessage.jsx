import React from 'react';
import { Calendar, Clock, MapPin, Plus, CalendarPlus } from 'lucide-react';
import moment from 'moment';

export default function EventMessage({ message, isOwn }) {
  let eventData = {};
  try { eventData = JSON.parse(message.event_data || '{}'); } catch {}

  const eventDate = eventData.date ? moment(eventData.date) : null;
  const dateStr = eventDate ? eventDate.format('MMM D, YYYY') : '';
  const timeStr = eventData.time || '';

  const googleCalUrl = eventDate
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventData.title || 'Event')}&dates=${eventDate.format('YYYYMMDD')}T${(timeStr || '00:00').replace(':', '')}00/${eventDate.format('YYYYMMDD')}T${(timeStr || '00:00').replace(':', '')}00&location=${encodeURIComponent(eventData.location || '')}&details=${encodeURIComponent(eventData.description || '')}`
    : '#';

  // Universal .ics download — opens in Apple Calendar, Outlook, Google, etc.
  const downloadICS = () => {
    if (!eventDate) return;
    const dt = eventDate.format('YYYYMMDD');
    const time = (timeStr || '00:00').replace(':', '');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//J-Connect//Event//EN', 'BEGIN:VEVENT',
      `UID:${dt}T${time}00-jconnect@events`,
      `DTSTART:${dt}T${time}00`, `DTEND:${dt}T${time}00`,
      `SUMMARY:${(eventData.title || 'Event').replace(/[\r\n,]/g, ' ')}`,
      `LOCATION:${(eventData.location || '').replace(/[\r\n,]/g, ' ')}`,
      `DESCRIPTION:${(eventData.description || '').replace(/[\r\n,]/g, ' ')}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(eventData.title || 'event').replace(/[^\w]+/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-3 pt-2 pb-1 min-w-[220px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 overflow-hidden"
          style={{ backgroundColor: isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(16,185,129,0.15)' }}>
          {eventDate ? (
            <>
              <span className={`text-[9px] font-bold uppercase leading-none ${isOwn ? 'text-white/70' : 'text-emerald-400'}`}>
                {eventDate.format('MMM')}
              </span>
              <span className="text-base font-bold leading-none text-white">{eventDate.format('D')}</span>
            </>
          ) : (
            <Calendar size={20} className={isOwn ? 'text-white' : 'text-emerald-400'} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{eventData.title || 'Event'}</p>
          {dateStr && (
            <p className="text-xs text-white/60 flex items-center gap-1 mt-0.5">
              <Clock size={11} /> {dateStr}{timeStr ? ` · ${timeStr}` : ''}
            </p>
          )}
        </div>
      </div>
      {eventData.location && (
        <p className="text-xs text-white/70 flex items-center gap-1 mb-1.5">
          <MapPin size={11} className="text-purple-400 shrink-0" /> {eventData.location}
        </p>
      )}
      {eventData.description && (
        <p className="text-xs text-white/60 mb-2 leading-relaxed">{eventData.description}</p>
      )}
      <div className="flex items-center gap-3 mt-1">
        <button onClick={downloadICS}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-colors">
          <CalendarPlus size={12} /> Add to Calendar
        </button>
        <a href={googleCalUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-300 hover:text-purple-200 transition-colors">
          <Plus size={12} /> Google Calendar
        </a>
      </div>
    </div>
  );
}