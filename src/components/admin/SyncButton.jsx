import { useState } from 'react';
import { RefreshCw, Loader } from 'lucide-react';

export default function SyncButton({ showId, label = 'Sync', onSynced }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/spotify/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId }),
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setResult(`Synced: ${data.newEpisodes} new, ${data.updatedEpisodes} updated.`);
      onSynced?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white text-xs font-ui font-medium rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
      >
        {loading ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        {label}
      </button>
      {result && <span className="text-xs text-green-700 font-ui">{result}</span>}
      {error && <span className="text-xs text-red-600 font-ui">{error}</span>}
    </div>
  );
}
