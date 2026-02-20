import { useNavigate } from 'react-router-dom';

export default function AuthErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-hearth-cream flex flex-col items-center justify-center p-10 text-center">
      <div className="text-4xl mb-4">{'\u26A0\uFE0F'}</div>
      <div className="font-serif text-xl font-semibold text-hearth-dark mb-2">
        Sign-in failed
      </div>
      <div className="text-sm text-hearth-muted mb-6">
        Something went wrong during authentication. Please try again.
      </div>
      <button
        onClick={() => navigate('/', { replace: true })}
        className="px-6 py-2.5 bg-hearth-dark text-hearth-cream rounded-xl text-sm font-medium hover:bg-[#4A4540] transition-colors cursor-pointer"
      >
        Back to Login
      </button>
    </div>
  );
}
