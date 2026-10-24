import { useState } from 'react';

export default function FamilySetupPage({ api, onUpdated }) {
  const [mode, setMode] = useState(null);
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
    <div className="min-h-screen bg-warmgray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-hearth-100 mb-4">
            <span className="text-2xl">👨‍👩‍👧‍👦</span>
          </div>
          <h1 className="text-2xl font-bold text-warmgray-900">Set up your family</h1>
          <p className="text-warmgray-500 mt-1">Create a new family or join an existing one</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!mode && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setMode('create')}
              className="card-interactive p-6 text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-hearth-50 flex items-center justify-center mb-3 group-hover:bg-hearth-100 transition-colors">
                <span className="text-xl">✨</span>
              </div>
              <h3 className="font-semibold text-warmgray-800 mb-1">Create a family</h3>
              <p className="text-sm text-warmgray-500">Start a new family and invite your partner</p>
            </button>

            <button
              onClick={() => setMode('join')}
              className="card-interactive p-6 text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                <span className="text-xl">🔗</span>
              </div>
              <h3 className="font-semibold text-warmgray-800 mb-1">Join a family</h3>
              <p className="text-sm text-warmgray-500">Enter an invite code from your partner</p>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="card p-6">
            <h3 className="font-semibold text-warmgray-800 mb-4">Create your family</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Family name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. The Smith Family"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && createFamily()}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={createFamily} disabled={busy} className="btn-primary flex-1">
                  {busy ? 'Creating...' : 'Create family'}
                </button>
                <button onClick={() => { setMode(null); setError(''); }} className="btn-secondary">
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="card p-6">
            <h3 className="font-semibold text-warmgray-800 mb-4">Join a family</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Invite code</label>
                <input
                  className="input font-mono text-center text-lg tracking-widest uppercase"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="A1B2C3D4"
                  maxLength={8}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && joinFamily()}
                />
                <p className="text-xs text-warmgray-500 mt-1">Ask your family member for this code</p>
              </div>
              <div className="flex gap-3">
                <button onClick={joinFamily} disabled={busy} className="btn-primary flex-1">
                  {busy ? 'Joining...' : 'Join family'}
                </button>
                <button onClick={() => { setMode(null); setError(''); }} className="btn-secondary">
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
