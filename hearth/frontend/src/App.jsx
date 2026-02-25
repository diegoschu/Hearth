import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, bootstrapAuth, setAuthToken } from './api';
import './App.css';
import { formatDateLabel, formatTimeRange, getFeedItemTitle } from './utils';

function Login() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  return (
    <div className="shell" style={{ maxWidth: 520, marginTop: 80 }}>
      <div className="card stack">
        <h1 style={{ marginBottom: 0 }}>🏠 Hearth</h1>
        <p className="muted" style={{ marginTop: 0 }}>Your family&apos;s second brain.</p>
        <a href={`${apiBase}/auth/google`}><button className="primary">Continue with Google</button></a>
      </div>
    </div>
  );
}

function AuthCallback({ onAuthed }) {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      navigate('/auth/error?reason=missing_token');
      return;
    }

    setAuthToken(token);
    onAuthed(token)
      .then(() => navigate('/'))
      .catch(() => navigate('/auth/error?reason=session'));    
  }, [navigate, onAuthed]);

  return <div className="shell"><div className="card">Signing you in…</div></div>;
}

function AuthError() {
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason');
  const message = reason === 'missing_token'
    ? 'No sign-in token was returned. Please try again.'
    : 'Authentication failed or expired. Try signing in again.';

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <div className="card stack">
        <h2>Couldn&apos;t sign you in</h2>
        <p className="error">{message}</p>
        <a href="/login"><button className="primary">Back to login</button></a>
      </div>
    </div>
  );
}

function FamilySetup({ onUpdated }) {
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const createFamily = async () => {
    if (!name.trim()) return setError('Family name is required.');
    setBusy(true);
    setError('');
    try {
      await api.post('/api/family', { name: name.trim() });
      onUpdated();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to create family.');
    } finally {
      setBusy(false);
    }
  };

  const joinFamily = async () => {
    if (!inviteCode.trim()) return setError('Invite code is required.');
    setBusy(true);
    setError('');
    try {
      await api.post('/api/family/join', { inviteCode: inviteCode.trim() });
      onUpdated();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to join family.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card stack">
      <h3 style={{ marginBottom: 0 }}>Set up your family</h3>
      <p className="muted" style={{ marginTop: 0 }}>Create a new family or join one with an invite code.</p>
      {error && <p className="error">{error}</p>}
      <div className="grid2">
        <div className="field">
          <label>Family name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="The Schummer Family" />
          <button className="primary" onClick={createFamily} disabled={busy}>Create family</button>
        </div>
        <div className="field">
          <label>Invite code</label>
          <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="A1B2C3D4" />
          <button onClick={joinFamily} disabled={busy}>Join family</button>
        </div>
      </div>
    </div>
  );
}

function AppShell({ user, onLogout }) {
  const [tab, setTab] = useState('feed');
  const [family, setFamily] = useState(null);
  const [feed, setFeed] = useState({ items: [], pendingCount: 0 });
  const [calendar, setCalendar] = useState({ days: [], conflicts: [] });
  const [sources, setSources] = useState([]);
  const [autonomy, setAutonomy] = useState([]);
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const [sourceDraft, setSourceDraft] = useState({ type: 'whatsapp', name: '', label: 'General', config: '{}' });
  const [sourceBusy, setSourceBusy] = useState(false);
  const [sourceMessage, setSourceMessage] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [f, fd, c, s, a, d] = await Promise.all([
        api.get('/api/family'),
        api.get('/api/feed'),
        api.get('/api/calendar'),
        api.get('/api/sources'),
        api.get('/api/settings/autonomy'),
        api.get('/api/digest'),
      ]);
      setFamily(f.data);
      setFeed(fd.data);
      setCalendar(c.data);
      setSources(s.data);
      setAutonomy(a.data);
      setDigest(d.data);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Failed to load workspace data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const id = setInterval(() => {
      api.get('/api/feed').then((r) => setFeed(r.data)).catch(() => null);
      api.get('/api/digest').then((r) => setDigest(r.data)).catch(() => null);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const markLoading = (id, state) => {
    setActionLoading((prev) => ({ ...prev, [id]: state }));
  };

  const confirm = async (id) => {
    markLoading(id, true);
    setActionError('');
    try {
      await api.post(`/api/feed/${id}/confirm`, {});
      await loadAll();
    } catch (e) {
      setActionError(e?.response?.data?.error?.message || 'Failed to confirm event.');
    } finally {
      markLoading(id, false);
    }
  };

  const dismiss = async (id) => {
    markLoading(id, true);
    setActionError('');
    try {
      await api.post(`/api/feed/${id}/dismiss`);
      await loadAll();
    } catch (e) {
      setActionError(e?.response?.data?.error?.message || 'Failed to dismiss event.');
    } finally {
      markLoading(id, false);
    }
  };

  const updateAutonomy = async (category, level) => {
    setActionError('');
    try {
      await api.put('/api/settings/autonomy', { category, level });
      await loadAll();
    } catch (e) {
      setActionError(e?.response?.data?.error?.message || 'Could not update autonomy setting.');
    }
  };

  const addSource = async () => {
    setSourceBusy(true);
    setSourceMessage('');
    setActionError('');

    let parsedConfig = {};
    try {
      parsedConfig = sourceDraft.config.trim() ? JSON.parse(sourceDraft.config) : {};
    } catch {
      setSourceBusy(false);
      setActionError('Config must be valid JSON.');
      return;
    }

    try {
      await api.post('/api/sources', {
        type: sourceDraft.type,
        name: sourceDraft.name.trim(),
        label: sourceDraft.label.trim() || 'General',
        config: parsedConfig,
      });
      setSourceDraft((prev) => ({ ...prev, name: '', config: '{}' }));
      setSourceMessage('Source connected.');
      await loadAll();
    } catch (e) {
      setActionError(e?.response?.data?.error?.message || 'Could not connect source.');
    } finally {
      setSourceBusy(false);
    }
  };

  const removeSource = async (id) => {
    setActionError('');
    try {
      await api.delete(`/api/sources/${id}`);
      await loadAll();
    } catch (e) {
      setActionError(e?.response?.data?.error?.message || 'Could not remove source.');
    }
  };

  const tabs = useMemo(() => [
    { id: 'feed', label: `Feed (${feed.pendingCount || 0})` },
    { id: 'calendar', label: 'Calendar' },
    { id: 'sources', label: 'Sources' },
    { id: 'settings', label: 'Settings' },
  ], [feed.pendingCount]);

  const hasFamily = Boolean(family?.id);

  return (
    <div className="shell">
      <div className="header">
        <div>
          <h2 style={{ marginBottom: 4 }}>Hearth</h2>
          <div className="muted">Welcome, {user?.name || 'there'}</div>
        </div>
        <div className="inline">
          <button onClick={loadAll}>Refresh</button>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      {loading && <p className="muted">Loading latest updates…</p>}
      {error && <p className="error">{error}</p>}
      {actionError && <p className="error">{actionError}</p>}

      {!hasFamily ? (
        <FamilySetup onUpdated={loadAll} />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="inline" style={{ justifyContent: 'space-between' }}>
              <strong>{family.name}</strong>
              <span className="badge">Invite code: {family.invite_code}</span>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>
              Members: {family.members?.map((m) => m.name).join(', ') || 'No members found'}
            </p>
          </div>

          <div className="nav">
            {tabs.map((t) => (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {tab === 'feed' && (
            <div className="stack">
              <div className="card">
                <h3>Daily digest</h3>
                {digest ? (
                  <pre style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{JSON.stringify(digest, null, 2)}</pre>
                ) : (
                  <p className="muted">Digest will appear once your sources start flowing.</p>
                )}
              </div>

              <div className="card stack">
                <h3 style={{ marginBottom: 0 }}>Review feed</h3>
                {feed.items?.length ? feed.items.map((item) => (
                  <div key={item.id} className="feed-item stack">
                    <div className="inline" style={{ justifyContent: 'space-between' }}>
                      <strong>{getFeedItemTitle(item)}</strong>
                      <span className="badge">{item.status}</span>
                    </div>
                    <div className="muted">{item.source?.type} · {item.source?.name || 'Unknown source'}</div>
                    <div>{item.rawMessage || 'No message preview available.'}</div>
                    <div className="inline">
                      <button
                        className="primary"
                        onClick={() => confirm(item.id)}
                        disabled={item.status !== 'pending' || actionLoading[item.id]}
                      >
                        {actionLoading[item.id] ? 'Working…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => dismiss(item.id)}
                        disabled={item.status !== 'pending' || actionLoading[item.id]}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )) : <p className="muted">No items to review. You&apos;re all caught up.</p>}
              </div>
            </div>
          )}

          {tab === 'calendar' && (
            <div className="card stack">
              <h3 style={{ marginBottom: 0 }}>Calendar</h3>
              {calendar.conflicts?.length > 0 && (
                <p className="error">{calendar.conflicts.length} conflict(s) detected. Review overlapping events.</p>
              )}
              {calendar.days?.length ? calendar.days.map((day) => (
                <div key={day.date} className="calendar-day stack">
                  <strong>{formatDateLabel(day.date)}</strong>
                  {day.events?.length ? day.events.map((event) => (
                    <div key={event.id} className="feed-item">
                      <div className="inline" style={{ justifyContent: 'space-between' }}>
                        <strong>{event.title}</strong>
                        <span className="muted">{formatTimeRange(event.start, event.end)}</span>
                      </div>
                      <div className="muted">{event.owner?.name || 'Family member'}</div>
                      {event.location && <div>📍 {event.location}</div>}
                    </div>
                  )) : <span className="muted">No events on this day.</span>}
                </div>
              )) : <p className="muted">No events in this range yet.</p>}
            </div>
          )}

          {tab === 'sources' && (
            <div className="stack">
              <div className="card stack">
                <h3 style={{ marginBottom: 0 }}>Connect source</h3>
                {sourceMessage && <p className="success">{sourceMessage}</p>}
                <div className="grid2">
                  <div className="field">
                    <label>Type</label>
                    <select value={sourceDraft.type} onChange={(e) => setSourceDraft((prev) => ({ ...prev, type: e.target.value }))}>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="gmail">Gmail</option>
                      <option value="gcal">Google Calendar</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Name</label>
                    <input value={sourceDraft.name} onChange={(e) => setSourceDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="School group chat" />
                  </div>
                </div>
                <div className="grid2">
                  <div className="field">
                    <label>Label</label>
                    <input value={sourceDraft.label} onChange={(e) => setSourceDraft((prev) => ({ ...prev, label: e.target.value }))} placeholder="General" />
                  </div>
                  <div className="field">
                    <label>Config (JSON)</label>
                    <textarea value={sourceDraft.config} onChange={(e) => setSourceDraft((prev) => ({ ...prev, config: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <button className="primary" onClick={addSource} disabled={sourceBusy || !sourceDraft.name.trim()}>
                    {sourceBusy ? 'Connecting…' : 'Add source'}
                  </button>
                </div>
              </div>

              <div className="card stack">
                <h3 style={{ marginBottom: 0 }}>Connected sources ({sources.length})</h3>
                {sources.length ? sources.map((source) => (
                  <div key={source.id} className="feed-item inline" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <strong>{source.name}</strong>
                      <div className="muted">{source.type} · {source.label || 'General'} · {source.status}</div>
                    </div>
                    <button onClick={() => removeSource(source.id)}>Remove</button>
                  </div>
                )) : <p className="muted">No sources connected yet.</p>}
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="card stack">
              <h3 style={{ marginBottom: 0 }}>Autonomy settings</h3>
              {autonomy.length ? autonomy.map((s) => (
                <div key={s.category} className="feed-item inline" style={{ justifyContent: 'space-between' }}>
                  <strong>{s.category}</strong>
                  <div className="inline">
                    {[1, 2, 3].map((level) => (
                      <button
                        key={level}
                        className={s.level === level ? 'primary' : ''}
                        onClick={() => updateAutonomy(s.category, level)}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              )) : <p className="muted">No autonomy preferences configured yet.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => bootstrapAuth());
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const fetchMe = async (existingToken = token) => {
    if (!existingToken) {
      setBooting(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      setToken(existingToken);
    } catch {
      setAuthToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }

    fetchMe();
  }, []);

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  if (booting) return <div className="shell"><div className="card">Loading app…</div></div>;

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
      <Route path="/auth/callback" element={<AuthCallback onAuthed={fetchMe} />} />
      <Route path="/auth/error" element={<AuthError />} />
      <Route path="/" element={token && user ? <AppShell user={user} onLogout={logout} /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
