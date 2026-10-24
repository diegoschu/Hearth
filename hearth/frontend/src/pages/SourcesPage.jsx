import { useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

const sourceTypes = [
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    icon: '💬',
    description: 'Connect a WhatsApp group chat',
    placeholder: 'e.g. School Parents Group',
  },
  {
    value: 'gmail',
    label: 'Gmail',
    icon: '📧',
    description: 'Connect a Gmail label or filter',
    placeholder: 'e.g. School Newsletters',
  },
  {
    value: 'gcal',
    label: 'Google Calendar',
    icon: '📅',
    description: 'Sync a Google Calendar',
    placeholder: 'e.g. Kids Activities Calendar',
  },
];

const categoryLabels = [
  { value: 'General', label: 'General' },
  { value: 'School', label: 'School' },
  { value: 'Medical', label: 'Medical' },
  { value: 'Activities', label: 'Activities' },
  { value: 'Social', label: 'Social' },
];

function SourceCard({ source, onRemove }) {
  const typeConfig = sourceTypes.find((t) => t.value === source.type) || sourceTypes[0];
  const lastPolled = source.last_polled
    ? new Date(source.last_polled).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : 'Never';

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-warmgray-50 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">{typeConfig.icon}</span>
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-warmgray-900">{source.name}</h4>
            <p className="text-xs text-warmgray-500 mt-0.5">
              {typeConfig.label} · {source.label || 'General'}
            </p>
          </div>
        </div>
        <StatusBadge status={source.status} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-warmgray-500">
          <span>Last polled: {lastPolled}</span>
          {source.message_count > 0 && (
            <span>{source.message_count} messages</span>
          )}
        </div>
        <button
          onClick={() => onRemove(source.id)}
          className="text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Remove
        </button>
      </div>

      {source.last_error && source.status === 'error' && (
        <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-2">
          <p className="text-xs text-red-700">{source.last_error}</p>
        </div>
      )}
    </div>
  );
}

export default function SourcesPage({ sources, api, onUpdated, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ type: 'whatsapp', name: '', label: 'General' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedType = sourceTypes.find((t) => t.value === draft.type) || sourceTypes[0];

  const addSource = async () => {
    if (!draft.name.trim()) return setError('Source name is required.');
    setBusy(true);
    setError('');
    try {
      await api.post('/api/sources', {
        type: draft.type,
        name: draft.name.trim(),
        label: draft.label.trim() || 'General',
        config: {},
      });
      setDraft({ type: 'whatsapp', name: '', label: 'General' });
      setShowForm(false);
      toast?.success('Source connected successfully!');
      onUpdated();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Could not connect source.');
    } finally {
      setBusy(false);
    }
  };

  const removeSource = async (id) => {
    try {
      await api.delete(`/api/sources/${id}`);
      toast?.success('Source removed.');
      onUpdated();
    } catch (e) {
      toast?.error(e?.response?.data?.error?.message || 'Could not remove source.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-warmgray-900">Connected sources</h2>
          <p className="text-sm text-warmgray-500">{sources.length} source{sources.length !== 1 ? 's' : ''} connected</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add source
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-5">
          <h3 className="font-semibold text-warmgray-800 mb-4">Connect a new source</h3>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="label">Source type</label>
            <div className="grid grid-cols-3 gap-2">
              {sourceTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setDraft((p) => ({ ...p, type: type.value }))}
                  className={`p-3 rounded-xl text-center border transition-all ${
                    draft.type === type.value
                      ? 'border-hearth-400 bg-hearth-50 ring-1 ring-hearth-200'
                      : 'border-warmgray-200 hover:border-warmgray-300'
                  }`}
                >
                  <span className="text-xl block mb-1">{type.icon}</span>
                  <span className="text-xs font-medium text-warmgray-700">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder={selectedType.placeholder}
              />
              <p className="text-xs text-warmgray-400 mt-1">{selectedType.description}</p>
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={draft.label}
                onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
              >
                {categoryLabels.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={addSource} disabled={busy || !draft.name.trim()} className="btn-primary">
              {busy ? 'Connecting...' : 'Connect source'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {sources.length > 0 ? (
        <div className="space-y-3">
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} onRemove={removeSource} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🔗"
          title="No sources connected"
          description="Connect a WhatsApp group, Gmail, or Google Calendar to start receiving events."
          action={
            !showForm && (
              <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
                Connect your first source
              </button>
            )
          }
        />
      )}
    </div>
  );
}
