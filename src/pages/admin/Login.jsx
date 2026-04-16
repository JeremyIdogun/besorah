import { useEffect, useState } from 'react';
import { usePostHog } from '@posthog/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';

function useNextPath() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  return params.get('next') || '/admin';
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const next = useNextPath();
  const posthog = usePostHog();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch('/api/admin/session', { credentials: 'include' });
        const data = await res.json();
        if (!cancelled && data.authenticated) {
          if (data.email) {
            posthog.identify(data.email, {
              email: data.email,
              role: 'admin',
            });
          }
          navigate(next, { replace: true });
          return;
        }
      } catch {
        // Ignore and show login form.
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [navigate, next, posthog]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const raw = await res.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.error || `Login failed (${res.status})`);
      }
      posthog.identify(email, {
        email,
        role: 'admin',
      });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted font-ui">Loading admin login...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card-bg rounded-2xl p-7 shadow-soft border border-amber-50">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
        >
          Admin Login
        </h1>
        <p className="text-sm text-muted font-ui mb-6">Sign in to manage imports and review tags.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-main font-ui mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main font-ui mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-ui font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            {loading ? <Loader size={14} className="animate-spin" /> : null}
            Sign In
          </button>
        </form>

        {error && <p className="text-sm text-red-600 font-ui mt-4">{error}</p>}
      </div>
    </div>
  );
}
