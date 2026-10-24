import { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import ConfidenceBadge from '../components/ConfidenceBadge';
import CategoryPill from '../components/CategoryPill';
import EmptyState from '../components/EmptyState';
import { formatDateLabel, formatTimeRange } from '../utils';

function FeedCard({ item, onConfirm, onDismiss, loading }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = item.status === 'pending';
  const parsed = item.parsed || {};

  return (
    <div className={`card p-4 transition-all ${isPending ? 'ring-1 ring-hearth-200 hover:ring-hearth-300' : 'opacity-80'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-warmgray-900 truncate">
            {parsed.eventName || 'Untitled event'}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-warmgray-500 flex items-center gap-1">
              {item.source?.type === 'whatsapp' && '💬'}
              {item.source?.type === 'gmail' && '📧'}
              {item.source?.type === 'gcal' && '📅'}
              {item.source?.name || 'Unknown source'}
            </span>
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="bg-warmgray-50 rounded-xl p-3 mb-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {parsed.date && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-warmgray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span className="text-warmgray-700">{formatDateLabel(parsed.date)}</span>
            </div>
          )}
          {parsed.time && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-warmgray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-warmgray-700">
                {formatTimeRange(
                  parsed.date ? `${parsed.date}T${parsed.time}` : null,
                  parsed.endTime && parsed.date ? `${parsed.date}T${parsed.endTime}` : null
                )}
              </span>
            </div>
          )}
          {parsed.location && (
            <div className="flex items-center gap-2 col-span-2">
              <svg className="w-4 h-4 text-warmgray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="text-warmgray-700">{parsed.location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {parsed.category && <CategoryPill category={parsed.category} />}
        <ConfidenceBadge confidence={parsed.confidence} />
      </div>

      {item.rawMessage && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left mb-3"
        >
          <p className={`text-xs text-warmgray-500 ${expanded ? '' : 'line-clamp-2'}`}>
            <span className="font-medium text-warmgray-600">Original: </span>
            {item.rawMessage}
          </p>
          <span className="text-xs text-hearth-600 font-medium">
            {expanded ? 'Show less' : 'Show more'}
          </span>
        </button>
      )}

      {parsed.notes && (
        <p className="text-sm text-warmgray-600 mb-3 bg-amber-50 rounded-lg p-2 border border-amber-100">
          <span className="font-medium">Note:</span> {parsed.notes}
        </p>
      )}

      {isPending && (
        <div className="flex gap-2 pt-2 border-t border-warmgray-100">
          <button
            onClick={() => onConfirm(item.id)}
            disabled={loading}
            className="btn-primary flex-1 btn-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {loading ? 'Confirming...' : 'Confirm to calendar'}
          </button>
          <button
            onClick={() => onDismiss(item.id)}
            disabled={loading}
            className="btn-ghost btn-sm"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default function FeedPage({ feed, digest, onConfirm, onDismiss, actionLoading }) {
  const [filter, setFilter] = useState('all');

  const filteredItems = (feed.items || []).filter((item) => {
    if (filter === 'pending') return item.status === 'pending';
    if (filter === 'resolved') return item.status !== 'pending';
    return true;
  });

  return (
    <div className="space-y-6">
      {digest && (
        <div className="card p-5">
          <h2 className="font-semibold text-warmgray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-hearth-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
            Today&apos;s overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-hearth-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-hearth-700">{digest.pendingReview || 0}</p>
              <p className="text-xs text-hearth-600 font-medium">Needs review</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{digest.eventsToday || 0}</p>
              <p className="text-xs text-blue-600 font-medium">Events today</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">{digest.eventsThisWeek || 0}</p>
              <p className="text-xs text-purple-600 font-medium">This week</p>
            </div>
            <div className={`${digest.conflicts > 0 ? 'bg-red-50' : 'bg-emerald-50'} rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-bold ${digest.conflicts > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {digest.conflicts || 0}
              </p>
              <p className={`text-xs font-medium ${digest.conflicts > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                Conflicts
              </p>
            </div>
          </div>

          {digest.suggestions?.length > 0 && (
            <div className="mt-3 bg-amber-50 rounded-xl p-3 border border-amber-100">
              <p className="text-xs font-medium text-amber-800 mb-1">Scheduling conflicts</p>
              {digest.suggestions.map((s, i) => (
                <p key={i} className="text-sm text-amber-700">{s}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-warmgray-900">Review feed</h2>
        <div className="flex gap-1 bg-warmgray-100 rounded-lg p-0.5">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'resolved', label: 'Resolved' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === f.id
                  ? 'bg-white text-warmgray-800 shadow-sm'
                  : 'text-warmgray-500 hover:text-warmgray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              onConfirm={onConfirm}
              onDismiss={onDismiss}
              loading={actionLoading[item.id]}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="✅"
          title={filter === 'pending' ? 'No pending items' : 'No feed items yet'}
          description={
            filter === 'pending'
              ? "You're all caught up! All items have been reviewed."
              : 'Connect a source to start receiving parsed events from your family messages.'
          }
        />
      )}
    </div>
  );
}
