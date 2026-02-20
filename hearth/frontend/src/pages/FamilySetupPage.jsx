import { useState } from 'react';
import { family } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function FamilySetupPage({ onComplete }) {
  const { user, setUser } = useAuth();
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!familyName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await family.create(familyName);
      setUser({ ...user, familyId: res.data.id });
      onComplete();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create family');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await family.join(inviteCode);
      setUser({ ...user, familyId: res.data.id });
      onComplete();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-hearth-cream to-[#F5EDDF] flex flex-col items-center justify-center p-10 text-center">
      <div className="text-5xl mb-5">{'\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66'}</div>
      <div className="font-serif text-2xl font-semibold text-hearth-dark mb-2">
        Set up your household
      </div>
      <div className="text-sm text-hearth-muted mb-8">
        Welcome, {user?.name?.split(' ')[0] || 'there'}! Create or join a family group.
      </div>

      {!mode && (
        <div className="max-w-xs w-full space-y-3">
          <button
            onClick={() => setMode('create')}
            className="w-full py-3 px-5 bg-hearth-dark text-hearth-cream rounded-xl text-sm font-medium hover:bg-[#4A4540] transition-colors cursor-pointer"
          >
            Create a Family
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full py-3 px-5 bg-white text-hearth-dark rounded-xl text-sm font-medium border border-hearth-border hover:border-hearth-warm transition-colors cursor-pointer"
          >
            Join with Invite Code
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="max-w-xs w-full space-y-3">
          <input
            type="text"
            placeholder="Family name (e.g., The Smiths)"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="w-full text-sm px-4 py-3 rounded-xl border border-hearth-border bg-white outline-none focus:border-hearth-warm text-center"
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={loading || !familyName.trim()}
            className="w-full py-3 px-5 bg-hearth-dark text-hearth-cream rounded-xl text-sm font-medium hover:bg-[#4A4540] transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Family'}
          </button>
          <button
            onClick={() => setMode(null)}
            className="text-xs text-hearth-muted hover:text-hearth-warm cursor-pointer"
          >
            Back
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="max-w-xs w-full space-y-3">
          <input
            type="text"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="w-full text-sm px-4 py-3 rounded-xl border border-hearth-border bg-white outline-none focus:border-hearth-warm text-center uppercase tracking-widest font-mono"
            autoFocus
          />
          <button
            onClick={handleJoin}
            disabled={loading || !inviteCode.trim()}
            className="w-full py-3 px-5 bg-hearth-dark text-hearth-cream rounded-xl text-sm font-medium hover:bg-[#4A4540] transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Family'}
          </button>
          <button
            onClick={() => setMode(null)}
            className="text-xs text-hearth-muted hover:text-hearth-warm cursor-pointer"
          >
            Back
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 text-xs text-danger font-medium">{error}</div>
      )}
    </div>
  );
}
