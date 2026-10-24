import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, bootstrapAuth, setAuthToken } from './api';

import Layout from './components/Layout';
import OnboardingChecklist from './components/OnboardingChecklist';
import ToastContainer from './components/Toast';
import { useToast } from './hooks/useToast';

import LoginPage from './pages/LoginPage';
import FamilySetupPage from './pages/FamilySetupPage';
import FeedPage from './pages/FeedPage';
import CalendarPage from './pages/CalendarPage';
import SourcesPage from './pages/SourcesPage';
import SettingsPage from './pages/SettingsPage';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-warmgray-50">
      <div className="card p-8 text-center">
        <div className="animate-pulse mb-3">
          <div className="w-12 h-12 rounded-2xl bg-hearth-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">🏠</span>
          </div>
        </div>
        <p className="text-warmgray-600">Signing you in...</p>
      </div>
    </div>
  );
}

function AuthError() {
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason');
  const message =
    reason === 'missing_token'
      ? 'No sign-in token was returned. Please try again.'
      : 'Authentication failed or expired. Try signing in again.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-warmgray-50 px-4">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-warmgray-900 mb-2">Couldn&apos;t sign you in</h2>
        <p className="text-sm text-warmgray-500 mb-6">{message}</p>
        <a href="/login">
          <button className="btn-primary w-full">Back to login</button>
        </a>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();

  const loadAll = useCallback(async () => {
    setError('');
    try {
      const [f, fd, c, s, a, d] = await Promise.all([
        api.get('/api/family'),
        api.get('/api/feed'),
        api.get('/api/calendar'),
        api.get('/api/sources'),
        api.get('/api/settings/autonomy'),
        api.get('/api/digest').catch(() => ({ data: null })),
      ]);
      setFamily(f.data);
      setFeed(fd.data);
      setCalendar(c.data);
      setSources(s.data);
      setAutonomy(a.data);
      setDigest(d.data);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const id = setInterval(() => {
      api.get('/api/feed').then((r) => setFeed(r.data)).catch(() => null);
      api.get('/api/digest').then((r) => setDigest(r.data)).catch(() => null);
    }, 15000);
    return () => clearInterval(id);
  }, [loadAll]);

  const markLoading = (id, state) => {
    setActionLoading((prev) => ({ ...prev, [id]: state }));
  };

  const confirmItem = async (id) => {
    markLoading(id, true);
    try {
      await api.post(`/api/feed/${id}/confirm`, {});
      toast.success('Event confirmed and added to calendar!');
      await loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || 'Failed to confirm event.');
    } finally {
      markLoading(id, false);
    }
  };

  const dismissItem = async (id) => {
    markLoading(id, true);
    try {
      await api.post(`/api/feed/${id}/dismiss`);
      toast.info('Item dismissed.');
      await loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || 'Failed to dismiss event.');
    } finally {
      markLoading(id, false);
    }
  };

  const updateAutonomy = async (category, level) => {
    try {
      await api.put('/api/settings/autonomy', { category, level });
      toast.success('Autonomy setting updated.');
      await loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || 'Could not update setting.');
    }
  };

  const syncCalendar = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/api/calendar/sync');
      if (data.degraded) {
        toast.error(data.error?.message || 'Calendar sync is temporarily unavailable.');
      } else {
        toast.success(`Synced ${data.synced} events from Google Calendar.`);
      }
      await loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || 'Calendar sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const hasFamily = Boolean(family?.id);

  const onboardingSteps = useMemo(
    () => ({
      family: hasFamily,
      source: sources.length > 0,
      review: (feed.items || []).some((i) => i.status !== 'pending'),
      calendar: (calendar.days || []).some((d) => d.events?.length > 0),
    }),
    [hasFamily, sources.length, feed.items, calendar.days]
  );

  const onboardingComplete = Object.values(onboardingSteps).every(Boolean);

  const handleOnboardingStepClick = (stepId) => {
    if (stepId === 'source') setTab('sources');
    if (stepId === 'review') setTab('feed');
    if (stepId === 'calendar') setTab('calendar');
  };

  if (!loading && !hasFamily) {
    return (
      <>
        <FamilySetupPage api={api} onUpdated={loadAll} />
        <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warmgray-50">
        <div className="text-center">
          <div className="animate-pulse mb-3">
            <div className="w-12 h-12 rounded-2xl bg-hearth-100 flex items-center justify-center mx-auto">
              <span className="text-2xl">🏠</span>
            </div>
          </div>
          <p className="text-warmgray-500 text-sm">Loading your family workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      user={user}
      family={family}
      activeTab={tab}
      onTabChange={setTab}
      onLogout={onLogout}
      pendingCount={feed.pendingCount}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-red-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={loadAll} className="ml-auto text-sm text-red-600 font-medium hover:text-red-800">
              Retry
            </button>
          </div>
        </div>
      )}

      {!onboardingComplete && (
        <OnboardingChecklist completedSteps={onboardingSteps} onStepClick={handleOnboardingStepClick} />
      )}

      {tab === 'feed' && (
        <FeedPage
          feed={feed}
          digest={digest}
          onConfirm={confirmItem}
          onDismiss={dismissItem}
          actionLoading={actionLoading}
        />
      )}

      {tab === 'calendar' && <CalendarPage calendar={calendar} onSync={syncCalendar} syncing={syncing} />}

      {tab === 'sources' && <SourcesPage sources={sources} api={api} onUpdated={loadAll} toast={toast} />}

      {tab === 'settings' && (
        <SettingsPage autonomy={autonomy} family={family} onUpdateAutonomy={updateAutonomy} user={user} />
      )}

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </Layout>
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

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warmgray-50">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="w-14 h-14 rounded-2xl bg-hearth-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🏠</span>
            </div>
          </div>
          <p className="text-warmgray-500">Loading Hearth...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback onAuthed={fetchMe} />} />
      <Route path="/auth/error" element={<AuthError />} />
      <Route path="/" element={token && user ? <AppShell user={user} onLogout={logout} /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
