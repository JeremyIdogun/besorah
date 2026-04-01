import { CheckCircle, XCircle, Clock } from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_ICON = {
  completed: <CheckCircle size={14} className="text-green-600" />,
  failed: <XCircle size={14} className="text-red-500" />,
  running: <Clock size={14} className="text-accent animate-pulse" />,
};

export default function IngestionRunList({ runs, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-amber-50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!runs?.length) {
    return <p className="text-sm text-muted font-ui py-4">No ingestion runs yet.</p>;
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div
          key={run.id}
          className="flex items-center justify-between px-4 py-3 bg-card-bg rounded-xl border border-amber-50 shadow-soft"
        >
          <div className="flex items-center gap-2">
            {STATUS_ICON[run.status] ?? <Clock size={14} className="text-muted" />}
            <div>
              <p className="text-sm font-medium text-text-main font-ui">
                {run.summary_json?.source === 'saved_episodes'
                  ? 'Saved Episodes'
                  : run.summary_json?.source === 'youtube_playlist'
                  ? `YouTube: ${run.summary_json.playlistTitle || run.summary_json.playlistId || 'Playlist'}`
                  : run.spotify_show_id
                  ? `Show: ${run.spotify_show_id}`
                  : 'All shows'}
              </p>
              <p className="text-xs text-muted">{formatDate(run.started_at)}</p>
            </div>
          </div>
          <div className="text-right">
            {run.summary_json && (
              <p className="text-xs text-muted font-ui">
                {run.summary_json.new ?? 0} new · {run.summary_json.updated ?? 0} updated
              </p>
            )}
            <span
              className={`text-xs font-ui font-medium capitalize ${
                run.status === 'completed'
                  ? 'text-green-700'
                  : run.status === 'failed'
                  ? 'text-red-600'
                  : 'text-accent'
              }`}
            >
              {run.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
