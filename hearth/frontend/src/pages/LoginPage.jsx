export default function LoginPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  return (
    <div className="min-h-screen bg-gradient-to-b from-hearth-50 to-warmgray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-hearth-100 mb-4">
            <span className="text-3xl">🏠</span>
          </div>
          <h1 className="text-3xl font-bold text-warmgray-900 tracking-tight">Hearth</h1>
          <p className="text-warmgray-500 mt-1">Your family&apos;s second brain</p>
        </div>

        <div className="card p-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-warmgray-800">Welcome back</h2>
            <p className="text-sm text-warmgray-500 mt-1">
              Sign in to manage your family&apos;s schedule
            </p>
          </div>

          <a href={`${apiBase}/auth/google`} className="block">
            <button className="w-full flex items-center justify-center gap-3 btn bg-white text-warmgray-700 border border-warmgray-200 hover:bg-warmgray-50 hover:border-warmgray-300 focus:ring-warmgray-300 py-3 text-base">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </a>

          <div className="mt-6 pt-6 border-t border-warmgray-100">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm">💬</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-warmgray-700">Capture family messages</p>
                  <p className="text-xs text-warmgray-500">Connect WhatsApp groups and email</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm">📅</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-warmgray-700">Smart calendar sync</p>
                  <p className="text-xs text-warmgray-500">AI extracts events and adds them to your calendar</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-hearth-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm">👨‍👩‍👧</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-warmgray-700">Family coordination</p>
                  <p className="text-xs text-warmgray-500">Shared calendar with conflict detection</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-warmgray-400 mt-6">
          By signing in, you agree to let Hearth manage your family&apos;s schedule data.
        </p>
      </div>
    </div>
  );
}
