import { useEffect, useMemo, useState } from 'react';
import { Loader, Link2, LibraryBig } from 'lucide-react';

function formatExpiry(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SpotifyLibraryImportCard({ authState, authReason, onImported }) {
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);
  const [scope, setScope] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function loadStatus() {
    setChecking(true);
    try {
      const res = await fetch('/api/spotify/oauth-status');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch Spotify connection status');
      setConnected(Boolean(data.connected));
      setScope(data.scope || null);
      setExpiresAt(data.expiresAt || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const authMessage = useMemo(() => {
    if (authState === 'success') {
      return { kind: 'success', text: 'Spotify account connected successfully.' };
    }
    if (authState === 'error') {
      return {
        kind: 'error',
        text: `Spotify connection failed${authReason ? `: ${authReason}` : '.'}`,
      };
    }
    return null;
  }, [authState, authReason]);

  async function handleImportSaved() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/spotify/import-saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import saved episodes');
      setResult(
        `Imported saved episodes: ${data.newEpisodes} new, ${data.updatedEpisodes} updated, ${data.skippedEpisodes} skipped.`,
      );
      onImported?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-card-bg rounded-2xl p-6 shadow-soft border border-amber-50 mb-8">
      <h2 className="text-base font-bold text-text-main font-ui mb-2">Saved Episodes Import</h2>
      <p className="text-sm text-muted font-ui mb-4">
        Connect your Spotify account and ingest episodes from your "Your Episodes" library.
      </p>

      {authMessage && (
        <p
          className={`text-sm font-ui mb-3 ${
            authMessage.kind === 'success' ? 'text-green-700' : 'text-red-600'
          }`}
        >
          {authMessage.text}
        </p>
      )}

      <p className="text-xs text-muted font-ui mb-1">
        Connection status:{' '}
        {checking ? 'Checking...' : connected ? 'Connected to Spotify' : 'Not connected'}
      </p>
      {scope && <p className="text-xs text-muted font-ui mb-1">Scope: {scope}</p>}
      {expiresAt && <p className="text-xs text-muted font-ui mb-3">Token expires: {formatExpiry(expiresAt)}</p>}

      <div className="flex flex-wrap gap-2">
        <a
          href="/api/spotify/auth/start"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-ui font-medium rounded-lg hover:bg-accent transition-colors"
        >
          <Link2 size={14} />
          {connected ? 'Reconnect Spotify' : 'Connect Spotify'}
        </a>

        <button
          onClick={handleImportSaved}
          disabled={!connected || checking || loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-ui font-medium rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <LibraryBig size={14} />}
          Import Saved Episodes
        </button>
      </div>

      {error && <p className="text-sm text-red-600 font-ui mt-3">{error}</p>}
      {result && <p className="text-sm text-green-700 font-ui mt-3">{result}</p>}
    </div>
  );
}
