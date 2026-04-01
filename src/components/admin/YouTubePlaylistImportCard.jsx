import { useCallback, useEffect, useState } from 'react';
import { Loader, PlayCircle, RefreshCw, Trash2 } from 'lucide-react';
import {
  deleteYouTubePlaylist,
  getYouTubePlaylists,
  importYouTubePlaylist,
  syncYouTubePlaylist,
} from '../../lib/queries';

function formatDate(d) {
  if (!d) return 'Never';
  return new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function YouTubePlaylistImportCard({ onImported }) {
  const [input, setInput] = useState('');
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncingPlaylistId, setSyncingPlaylistId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getYouTubePlaylists();
      setPlaylists(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleImport(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!input.trim()) return;

    setSubmitting(true);
    try {
      const result = await importYouTubePlaylist(input.trim());
      const details = `${result.newEpisodes} new, ${result.updatedEpisodes} updated, ${result.skippedEpisodes} skipped, ${result.failedEpisodes ?? 0} failed.`;
      setSuccess(
        `Imported "${result.playlist?.title}". ${details} Review queue contains newly imported unreviewed sermons.`,
      );
      setInput('');
      await load();
      onImported?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSync(playlistId) {
    setError(null);
    setSuccess(null);
    setSyncingPlaylistId(playlistId);
    try {
      const result = await syncYouTubePlaylist(playlistId);
      const details = `${result.newEpisodes} new, ${result.updatedEpisodes} updated, ${result.skippedEpisodes} skipped, ${result.failedEpisodes ?? 0} failed.`;
      setSuccess(
        `Synced "${result.playlist?.title}". ${details}`,
      );
      await load();
      onImported?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncingPlaylistId(null);
    }
  }

  async function handleDelete(playlist) {
    if (!window.confirm(`Remove "${playlist.title}"? This won't delete imported sermons.`)) return;
    setDeletingId(playlist.id);
    setError(null);
    setSuccess(null);
    try {
      await deleteYouTubePlaylist(playlist.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-card-bg rounded-2xl p-6 shadow-soft border border-amber-50 mb-8">
      <h2 className="text-base font-bold text-text-main font-ui mb-2">YouTube Playlists (Unlisted)</h2>
      <p className="text-sm text-muted font-ui mb-4">
        Paste an unlisted YouTube playlist URL or ID to ingest sermons.
      </p>

      <form onSubmit={handleImport} className="space-y-3 mb-5">
        <label className="block text-sm font-ui font-medium text-text-main">
          Playlist URL or ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://www.youtube.com/playlist?list=..."
            className="flex-1 px-4 py-2 rounded-lg border border-amber-200 text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={!input.trim() || submitting}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-ui font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader size={14} className="animate-spin" /> : <PlayCircle size={14} />}
            Import Playlist
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 font-ui mb-3">{error}</p>}
      {success && <p className="text-sm text-green-700 font-ui mb-3">{success}</p>}

      <h3 className="text-sm font-medium text-text-main font-ui mb-2">Tracked YouTube Playlists</h3>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 bg-amber-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <p className="text-sm text-muted font-ui">No YouTube playlists added yet.</p>
      ) : (
        <div className="space-y-2">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="flex items-start justify-between gap-3 border border-amber-100 rounded-xl p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm text-text-main font-ui truncate">{playlist.title}</p>
                <p className="text-xs text-muted font-ui">{playlist.channel_title || 'Unknown channel'}</p>
                <p className="text-xs text-muted font-ui mt-1">
                  Last synced: {formatDate(playlist.last_synced_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleSync(playlist.youtube_playlist_id)}
                  disabled={syncingPlaylistId === playlist.youtube_playlist_id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-ui font-medium hover:bg-primary transition-colors disabled:opacity-50"
                >
                  {syncingPlaylistId === playlist.youtube_playlist_id ? (
                    <Loader size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  Sync
                </button>
                <button
                  onClick={() => handleDelete(playlist)}
                  disabled={deletingId === playlist.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-ui text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  {deletingId === playlist.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
