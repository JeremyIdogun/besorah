import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function AdminGate({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch('/api/admin/session', {
          credentials: 'include',
        });
        const data = await res.json();
        if (!cancelled) {
          setAuthenticated(Boolean(data.authenticated));
        }
      } catch {
        if (!cancelled) setAuthenticated(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted font-ui">Checking admin session...</div>
      </div>
    );
  }

  if (!authenticated) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/admin/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}

