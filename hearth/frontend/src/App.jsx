import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, bootstrapAuth, setAuthToken } from './api';

function Login() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  return (
    <div style={{ maxWidth: 520, margin: '80px auto', fontFamily: 'sans-serif', padding: 16 }}>
      <h1>🏠 Hearth</h1>
      <p>Your family's second brain.</p>
      <a href={`${apiBase}/auth/google`}><button>Continue with Google</button></a>
    </div>
  );
}

function AuthCallback({ onAuthed }) {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return navigate('/auth/error');
    setAuthToken(token);
    onAuthed(token).finally(() => navigate('/'));
  }, [navigate, onAuthed]);
  return <div style={{ padding: 20 }}>Signing you in…</div>;
}

function AuthError() {
  return <div style={{ padding: 20 }}>Authentication failed. Try again from login.</div>;
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
      setError(e?.response?.data?.error?.message || e.message || 'Failed to load');
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

  const confirm = async (id) => {
    await api.post(`/api/feed/${id}/confirm`, {});
    await loadAll();
  };

  const dismiss = async (id) => {
    await api.post(`/api/feed/${id}/dismiss`);
    await loadAll();
  };

  const updateAutonomy = async (category, level) => {
    await api.put('/api/settings/autonomy', { category, level });
    await loadAll();
  };

  const tabs = useMemo(() => ['feed', 'calendar', 'sources', 'settings'], []);

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 760, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Hearth · {user?.name}</h2>
        <button onClick={onLogout}>Logout</button>
      </div>
      <div style={{ marginBottom: 12 }}>
        {tabs.map((t) => <button key={t} onClick={() => setTab(t)} style={{ marginRight: 8 }}>{t}</button>)}
      </div>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {tab === 'feed' && (
        <div>
          <h3>Digest</h3>
          <pre>{JSON.stringify(digest, null, 2)}</pre>
          <h3>Inbox (pending: {feed.pendingCount})</h3>
          {feed.items?.map((item) => (
            <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <strong>{item.parsed.eventName || 'Untitled event'}</strong> · {item.status}<br />
              <small>{item.source?.type} / {item.source?.name}</small>
              <p>{item.rawMessage}</p>
              <button onClick={() => confirm(item.id)} disabled={item.status !== 'pending'}>Confirm</button>
              <button onClick={() => dismiss(item.id)} style={{ marginLeft: 8 }} disabled={item.status !== 'pending'}>Dismiss</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'calendar' && (
        <div>
          <h3>Calendar</h3>
          <pre>{JSON.stringify(calendar, null, 2)}</pre>
        </div>
      )}

      {tab === 'sources' && (
        <div>
          <h3>Sources ({sources.length})</h3>
          <ul>{sources.map((s) => <li key={s.id}>{s.type} · {s.name} · {s.status}</li>)}</ul>
        </div>
      )}

      {tab === 'settings' && (
        <div>
          <h3>Autonomy</h3>
          {autonomy.map((s) => (
            <div key={s.category}>
              {s.category}: {s.level}
              {[1, 2, 3].map((l) => <button key={l} style={{ marginLeft: 4 }} onClick={() => updateAutonomy(s.category, l)}>{l}</button>)}
            </div>
          ))}
          <h3>Family</h3>
          <pre>{JSON.stringify(family, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => bootstrapAuth());
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const fetchMe = async (existingToken = token) => {
    if (!existingToken) return;
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      setToken(existingToken);
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    if (!token) return setBooting(false);
    fetchMe();
  }, []);

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  if (booting) return <div style={{ padding: 20 }}>Loading app…</div>;

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
