import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import FeedPage from './pages/FeedPage';
import CalendarPage from './pages/CalendarPage';
import SourcesPage from './pages/SourcesPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AuthErrorPage from './pages/AuthErrorPage';
import FamilySetupPage from './pages/FamilySetupPage';

const TABS = [
  { id: 'feed', label: 'Feed', icon: '\uD83C\uDFE0' },
  { id: 'calendar', label: 'Calendar', icon: '\uD83D\uDCC5' },
  { id: 'sources', label: 'Sources', icon: '\uD83D\uDD0C' },
  { id: 'settings', label: 'Settings', icon: '\u2699\uFE0F' },
];

function AppShell() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('feed');
  const [familyReady, setFamilyReady] = useState(!!user?.family_id);

  if (!familyReady && !user?.family_id) {
    return <FamilySetupPage onComplete={() => setFamilyReady(true)} />;
  }

  return (
    <div className="font-sans bg-hearth-cream min-h-screen text-hearth-dark max-w-[480px] mx-auto relative overflow-hidden">
      <Header />

      {/* Tab navigation */}
      <div className="flex gap-1 px-5 py-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-[20px] text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-hearth-dark text-hearth-cream'
                : 'text-[#7A7570] border border-hearth-border-dark bg-transparent'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Page content */}
      <div className="pb-20 min-h-[60vh]">
        {activeTab === 'feed' && <FeedPage />}
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'sources' && <SourcesPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-hearth-cream flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">{'\uD83C\uDFE0'}</div>
          <div className="text-sm text-hearth-muted">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function LoginRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-hearth-cream flex items-center justify-center">
        <div className="text-4xl">{'\uD83C\uDFE0'}</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/error" element={<AuthErrorPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
