import { useEffect, useState, useCallback } from 'react';
import { getSpotifyShows } from '../../lib/queries';
import ShowImportForm from '../../components/admin/ShowImportForm';
import SyncButton from '../../components/admin/SyncButton';
import SpotifyLibraryImportCard from '../../components/admin/SpotifyLibraryImportCard';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function formatDate(d) {
  if (!d) return 'Never';
  return new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Shows() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const spotifyAuth = query.get('spotifyAuth');
  const spotifyAuthReason = query.get('reason');

  const load = useCallback(() => {
    setLoading(true);
    getSpotifyShows()
      .then(setShows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary font-ui mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
        >
          Spotify Shows
        </h1>
        <p className="text-sm text-muted font-ui mb-8">
          Add and manage Spotify podcast shows to import sermons from.
        </p>

        <div className="bg-card-bg rounded-2xl p-6 shadow-soft border border-amber-50 mb-8">
          <h2 className="text-base font-bold text-text-main font-ui mb-4">Add New Show</h2>
          <ShowImportForm onImported={load} />
        </div>

        <SpotifyLibraryImportCard
          authState={spotifyAuth}
          authReason={spotifyAuthReason}
          onImported={load}
        />

        <h2
          className="text-lg font-bold mb-4"
          style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
        >
          Tracked Shows
        </h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-amber-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : shows.length === 0 ? (
          <p className="text-muted font-ui text-sm py-6">No shows added yet.</p>
        ) : (
          <div className="space-y-3">
            {shows.map((show) => (
              <div
                key={show.id}
                className="flex items-start justify-between gap-4 bg-card-bg rounded-xl p-5 shadow-soft border border-amber-50"
              >
                <div className="flex items-start gap-4">
                  {show.image_url && (
                    <img
                      src={show.image_url}
                      alt={show.title}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-medium text-text-main font-ui">{show.title}</p>
                    {show.publisher && (
                      <p className="text-xs text-muted font-ui">{show.publisher}</p>
                    )}
                    <p className="text-xs text-muted font-ui mt-1">
                      Last synced: {formatDate(show.last_synced_at)}
                    </p>
                    <span
                      className={`text-xs font-ui font-medium capitalize mt-1 inline-block ${
                        show.status === 'active' ? 'text-green-700' : 'text-muted'
                      }`}
                    >
                      {show.status}
                    </span>
                  </div>
                </div>
                <SyncButton showId={show.spotify_show_id} onSynced={load} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
