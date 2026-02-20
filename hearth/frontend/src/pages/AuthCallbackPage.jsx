import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../utils/api';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('hearth_token', token);
      auth.getUser()
        .then((res) => {
          setUser(res.data);
          navigate('/', { replace: true });
        })
        .catch(() => {
          navigate('/auth/error', { replace: true });
        });
    } else {
      navigate('/auth/error', { replace: true });
    }
  }, [searchParams, navigate, setUser]);

  return (
    <div className="fixed inset-0 bg-hearth-cream flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">{'\uD83C\uDFE0'}</div>
        <div className="text-sm text-hearth-muted">Signing you in...</div>
      </div>
    </div>
  );
}
