import { useState } from 'react';
import { Plus, Loader } from 'lucide-react';

function extractShowId(input) {
  const value = input.trim();
  if (!value) return { showId: null, error: 'Please enter a Spotify show URL or ID.' };

  if (/spotify\.com\/collection\/your-episodes/i.test(value)) {
    return {
      showId: null,
      error:
        'Your Episodes cannot be added as a show. Use "Connect Spotify" and "Import Saved Episodes" instead.',
    };
  }

  if (/spotify\.com\/playlist\//i.test(value)) {
    return {
      showId: null,
      error: 'Playlist URLs are not supported in Add Show. Use a podcast show URL or show ID.',
    };
  }

  // Handle full Spotify URLs: https://open.spotify.com/show/XXXX
  const match = value.match(/spotify\.com\/show\/([A-Za-z0-9]+)/);
  if (match) return { showId: match[1], error: null };
  // Handle spotify:show:XXXX URIs
  const uri = value.match(/spotify:show:([A-Za-z0-9]+)/);
  if (uri) return { showId: uri[1], error: null };

  if (/^https?:\/\//i.test(value)) {
    return {
      showId: null,
      error: 'Invalid show URL. Please paste a Spotify show URL or show ID.',
    };
  }

  // Assume bare ID
  return { showId: value, error: null };
}

export default function ShowImportForm({ onImported }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const { showId, error: parseError } = extractShowId(input);
    if (parseError) {
      setError(parseError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/spotify/add-show', {
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
      if (!res.ok) throw new Error(data.error || 'Failed to import show');
      setSuccess(`Imported "${data.show?.title}" with ${data.episodesImported} episode(s).`);
      setInput('');
      onImported?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-ui font-medium text-text-main">
        Spotify Show URL or ID
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://open.spotify.com/show/… or show ID"
          className="flex-1 px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-ui font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
          Add Show
        </button>
      </div>
      {error && <p className="text-sm text-red-600 font-ui">{error}</p>}
      {success && <p className="text-sm text-green-700 font-ui">{success}</p>}
    </form>
  );
}
