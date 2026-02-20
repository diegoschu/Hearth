import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-hearth-cream to-[#F5EDDF] flex flex-col items-center justify-center p-10 text-center">
      <div className="text-6xl mb-6">{'\uD83C\uDFE0'}</div>
      <div className="font-serif text-4xl font-semibold text-hearth-dark mb-2 tracking-tight">
        <span className="text-hearth-warm">h</span>earth
      </div>
      <div className="text-sm text-hearth-muted mb-8">Your family's second brain</div>

      <div className="max-w-xs w-full space-y-3">
        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 py-3 px-5 bg-white rounded-xl border border-hearth-border text-sm font-medium text-hearth-dark hover:border-hearth-warm hover:shadow-sm transition-all cursor-pointer"
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        <div className="text-[11px] text-hearth-muted leading-relaxed mt-6">
          Hearth uses Google to sync your calendars, parse emails,
          and keep your family organized. Powered by Claude AI.
        </div>
      </div>

      <div className="absolute bottom-10 text-[10px] text-hearth-muted opacity-50">
        Built with {'\u2764\uFE0F'} for busy families
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}
