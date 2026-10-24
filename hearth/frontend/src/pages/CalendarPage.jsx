import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import { formatDateLabel, formatTimeRange } from '../utils';

function ConflictBanner({ conflicts }) {
  if (!conflicts?.length) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <h3 className="text-sm font-semibold text-red-800">
          {conflicts.length} scheduling conflict{conflicts.length > 1 ? 's' : ''} detected
        </h3>
      </div>
      {conflicts.map((c, i) => (
        <p key={i} className="text-sm text-red-700 ml-7">{c.suggestion}</p>
      ))}
    </div>
  );
}

function DaySection({ day }) {
  const today = new Date().toISOString().split('T')[0];
  const isToday = day.date === today;

  return (
    <div className="relative">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
          isToday ? 'bg-hearth-600 text-white' : 'bg-warmgray-100 text-warmgray-700'
        }`}>
          <span className="text-xs font-medium leading-none">
            {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
          </span>
          <span className="text-lg font-bold leading-none mt-0.5">
            {new Date(`${day.date}T12:00:00`).getDate()}
          </span>
        </div>
        <div>
          <h3 className={`text-sm font-semibold ${isToday ? 'text-hearth-700' : 'text-warmgray-800'}`}>
            {isToday ? 'Today' : formatDateLabel(day.date)}
          </h3>
          <p className="text-xs text-warmgray-500">
            {day.events?.length || 0} event{(day.events?.length || 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="ml-[3.75rem] space-y-2">
        {day.events?.map((event) => (
          <div key={event.id} className="card-interactive p-3">
            <div className="flex items-center gap-3">
              <div
                className="w-1 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: event.color || '#D4913A' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-medium text-warmgray-900 truncate">{event.title}</h4>
                  <span className="text-xs text-warmgray-500 flex-shrink-0">
                    {formatTimeRange(event.start, event.end)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {event.owner && (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={event.owner.name} picture={event.owner.picture} size="sm" />
                      <span className="text-xs text-warmgray-500">{event.owner.name}</span>
                    </div>
                  )}
                  {event.location && (
                    <span className="text-xs text-warmgray-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarPage({ calendar, onSync, syncing }) {
  const hasDays = calendar.days?.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-warmgray-900">Family calendar</h2>
          <p className="text-sm text-warmgray-500">Next 7 days</p>
        </div>
        <button onClick={onSync} disabled={syncing} className="btn-secondary btn-sm">
          <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.182-3.182" />
          </svg>
          {syncing ? 'Syncing...' : 'Sync Google Calendar'}
        </button>
      </div>

      <ConflictBanner conflicts={calendar.conflicts} />

      {hasDays ? (
        <div className="space-y-6">
          {calendar.days.map((day) => (
            <DaySection key={day.date} day={day} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📅"
          title="No events this week"
          description="Confirmed events from your feed will appear here, along with synced Google Calendar events."
          action={
            <button onClick={onSync} disabled={syncing} className="btn-primary btn-sm">
              Sync from Google Calendar
            </button>
          }
        />
      )}
    </div>
  );
}
