import { useState, useEffect, useCallback } from 'react';
import { calendar as calendarApi } from '../utils/api';

const MOCK_CALENDAR = [
  {
    day: 'Today \u00B7 Thu Feb 20',
    events: [
      { time: '3:15 PM', title: 'School Pickup \u2014 Emma', owner: 'Dad', color: '#4A90D9' },
      { time: '4:30 PM', title: 'Soccer Practice', owner: 'Dad', color: '#6DBE4A', note: '\u26A0\uFE0F Canceled (rain)' },
      { time: '6:00 PM', title: 'Dinner: Chicken stir fry', owner: 'Mom', color: '#E8913A' },
    ],
  },
  {
    day: 'Fri Feb 21',
    events: [
      { time: '8:00 AM', title: 'School Drop-off', owner: 'Mom', color: '#4A90D9' },
      { time: '10:00 AM', title: 'Mom \u2014 Dentist', owner: 'Mom', color: '#D94A6B' },
      { time: '3:15 PM', title: 'School Pickup \u2014 Emma', owner: 'Dad', color: '#4A90D9' },
      { time: '5:00 PM', title: 'Piano Lesson', owner: 'Mom', color: '#9B6DBE' },
    ],
  },
  {
    day: 'Sat Feb 22',
    events: [
      { time: '9:00 AM', title: 'Farmers Market', owner: 'Family', color: '#6DBE4A' },
      { time: '11:00 AM', title: "Emma \u2014 Playdate at Sarah's", owner: 'Dad', color: '#E8913A' },
    ],
  },
];

export default function CalendarPage() {
  const [days, setDays] = useState(MOCK_CALENDAR);
  const [syncing, setSyncing] = useState(false);

  const loadCalendar = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const res = await calendarApi.get(today, weekEnd);

      if (res.data?.days && Object.keys(res.data.days).length > 0) {
        const formatted = Object.entries(res.data.days).map(([date, events]) => ({
          day: formatDateLabel(date),
          events: events.map((e) => ({
            time: formatTime(e.start_time),
            title: e.title,
            owner: e.users?.name || 'Family',
            color: getCategoryColor(e.category),
          })),
        }));
        setDays(formatted);
      }
    } catch {
      // Keep mock data
    }
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await calendarApi.sync();
      await loadCalendar();
    } catch {
      // Ignore
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="px-5 pb-5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="font-serif text-lg font-semibold text-hearth-dark">Family Calendar</div>
          <div className="text-xs text-hearth-muted">Unified view \u00B7 synced calendars</div>
        </div>
        <div className="flex gap-1.5 items-center">
          <span className="text-[11px] bg-dad-bg text-dad-text px-2 py-1 rounded-lg font-semibold">Dad</span>
          <span className="text-[11px] bg-mom-bg text-mom-text px-2 py-1 rounded-lg font-semibold">Mom</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-[11px] bg-hearth-surface-dark text-hearth-muted px-2 py-1 rounded-lg font-medium hover:bg-hearth-border transition-colors cursor-pointer disabled:opacity-50"
          >
            {syncing ? '\u21BB Syncing...' : '\u21BB Sync'}
          </button>
        </div>
      </div>

      {days.map((day, di) => (
        <div key={di} className="mb-5">
          <div className="text-[13px] font-semibold text-hearth-muted mb-2 uppercase tracking-wide">
            {day.day}
          </div>
          {day.events.map((event, ei) => (
            <div
              key={ei}
              className={`flex items-center gap-3 px-3.5 py-2.5 bg-white rounded-xl mb-1.5 border border-hearth-border ${
                event.note ? 'opacity-50' : ''
              }`}
            >
              <div className="text-xs font-medium text-hearth-muted w-[65px] shrink-0">
                {event.time}
              </div>
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: event.color }}
              />
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[13px] font-medium text-hearth-dark ${
                    event.note?.includes('Canceled') ? 'line-through' : ''
                  }`}
                >
                  {event.title}
                </div>
                {event.note && (
                  <div className="text-[11px] font-medium text-danger">{event.note}</div>
                )}
              </div>
              <div className="text-[11px] text-[#B5B0AA] font-medium shrink-0">
                {event.owner}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return isToday ? `Today \u00B7 ${dayName} ${monthDay}` : `${dayName} ${monthDay}`;
}

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getCategoryColor(category) {
  const colors = {
    school: '#4A90D9',
    medical: '#D94A6B',
    extracurricular: '#6DBE4A',
    social: '#E8913A',
    household: '#9B6DBE',
  };
  return colors[category] || '#9B9590';
}
