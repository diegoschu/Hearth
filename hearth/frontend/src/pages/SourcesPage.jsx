import { useState, useEffect, useCallback } from 'react';
import { sources as sourcesApi } from '../utils/api';

const MOCK_SOURCES = [
  { id: 1, type: 'whatsapp', name: 'Lincoln Elementary Parents', label: 'School', status: 'connected', message_count: 47 },
  { id: 2, type: 'whatsapp', name: 'Soccer Team U8', label: 'Extracurricular', status: 'connected', message_count: 23 },
  { id: 3, type: 'whatsapp', name: 'Family Group', label: 'Family', status: 'connected', message_count: 156 },
  { id: 4, type: 'gmail', name: 'school@lincoln.edu', label: 'School', status: 'connected', message_count: 12 },
  { id: 5, type: 'gmail', name: 'drsmith@pediatrics.com', label: 'Medical', status: 'connected', message_count: 3 },
  { id: 6, type: 'gcal', name: "Dad's Calendar", label: 'Personal', status: 'connected', message_count: null },
  { id: 7, type: 'gcal', name: "Mom's Calendar", label: 'Personal', status: 'connected', message_count: null },
  { id: 8, type: 'gcal', name: 'Family Calendar', label: 'Shared', status: 'connected', message_count: null },
];

const ICON_MAP = { whatsapp: '\uD83D\uDCAC', gmail: '\uD83D\uDCE7', gcal: '\uD83D\uDCC5' };
const LABEL_MAP = { whatsapp: 'WhatsApp Chats', gmail: 'Gmail Senders', gcal: 'Google Calendars' };
const ADD_LABEL = { whatsapp: 'Chat', gmail: 'Sender', gcal: 'Calendar' };

export default function SourcesPage() {
  const [sourceList, setSourceList] = useState(MOCK_SOURCES);
  const [showAdd, setShowAdd] = useState(null);
  const [newSource, setNewSource] = useState({ name: '', label: '', config: '' });

  const loadSources = useCallback(async () => {
    try {
      const res = await sourcesApi.list();
      if (res.data?.length > 0) {
        setSourceList(res.data);
      }
    } catch {
      // Keep mock data
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleAdd = async (type) => {
    if (!newSource.name.trim()) return;
    try {
      await sourcesApi.create({
        type,
        name: newSource.name,
        label: newSource.label || 'General',
        config: newSource.config ? { chatId: newSource.config } : {},
      });
      setShowAdd(null);
      setNewSource({ name: '', label: '', config: '' });
      loadSources();
    } catch {
      // Ignore
    }
  };

  const handleRemove = async (id) => {
    setSourceList((s) => s.filter((src) => src.id !== id));
    try {
      await sourcesApi.remove(id);
    } catch {
      loadSources(); // Revert on failure
    }
  };

  const grouped = {
    whatsapp: sourceList.filter((s) => s.type === 'whatsapp'),
    gmail: sourceList.filter((s) => s.type === 'gmail'),
    gcal: sourceList.filter((s) => s.type === 'gcal'),
  };

  return (
    <div className="px-5 pb-5">
      <div className="font-serif text-lg font-semibold mb-1 text-hearth-dark">Connected Sources</div>
      <div className="text-xs text-hearth-muted mb-4">The agent monitors these for family-relevant info</div>

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="mb-5">
          <div className="text-xs font-semibold text-hearth-muted mb-2 uppercase tracking-wide">
            {ICON_MAP[type]} {LABEL_MAP[type]}
          </div>

          {items.map((source) => (
            <div key={source.id} className="flex items-center gap-3 px-3.5 py-3 bg-white rounded-xl mb-2 border border-hearth-border">
              <div
                className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-base shrink-0 ${
                  type === 'whatsapp'
                    ? 'bg-success-bg'
                    : type === 'gmail'
                    ? 'bg-mom-bg'
                    : 'bg-dad-bg'
                }`}
              >
                {ICON_MAP[type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-hearth-dark truncate">{source.name}</div>
                <div className="text-[11px] text-hearth-muted">
                  {source.label}
                  {source.message_count != null && ` \u00B7 ${source.message_count} messages scanned`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${
                    source.status === 'connected'
                      ? 'bg-success-bg text-success'
                      : 'bg-danger-bg text-danger'
                  }`}
                >
                  {source.status === 'connected' ? 'Connected' : 'Error'}
                </span>
                <button
                  onClick={() => handleRemove(source.id)}
                  className="text-hearth-muted hover:text-danger text-sm cursor-pointer transition-colors"
                  title="Remove source"
                >
                  \u00D7
                </button>
              </div>
            </div>
          ))}

          {/* Add source button / form */}
          {showAdd === type ? (
            <div className="p-3 rounded-xl border-2 border-dashed border-hearth-border-dark bg-hearth-surface mb-2">
              <input
                type="text"
                placeholder={`${ADD_LABEL[type]} name`}
                value={newSource.name}
                onChange={(e) => setNewSource((s) => ({ ...s, name: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-hearth-border mb-2 bg-white outline-none focus:border-hearth-warm"
              />
              <input
                type="text"
                placeholder="Label (e.g., School, Medical)"
                value={newSource.label}
                onChange={(e) => setNewSource((s) => ({ ...s, label: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-hearth-border mb-2 bg-white outline-none focus:border-hearth-warm"
              />
              {type === 'whatsapp' && (
                <input
                  type="text"
                  placeholder="WhatsApp Chat ID"
                  value={newSource.config}
                  onChange={(e) => setNewSource((s) => ({ ...s, config: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-hearth-border mb-2 bg-white outline-none focus:border-hearth-warm"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAdd(type)}
                  className="flex-1 text-xs font-medium py-2 rounded-lg bg-hearth-dark text-hearth-cream hover:bg-[#4A4540] transition-colors cursor-pointer"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAdd(null); setNewSource({ name: '', label: '', config: '' }); }}
                  className="flex-1 text-xs font-medium py-2 rounded-lg bg-hearth-surface-dark text-hearth-muted hover:bg-hearth-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(type)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-hearth-border-dark text-hearth-muted text-[13px] font-medium hover:border-hearth-warm hover:text-hearth-warm transition-colors cursor-pointer mb-2"
            >
              + Add {ADD_LABEL[type]}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
