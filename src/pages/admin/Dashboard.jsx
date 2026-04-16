import { useEffect, useState } from 'react';
import { usePostHog } from '@posthog/react';
import { Link } from 'react-router-dom';
import { getSpotifyShows, getIngestionRuns, getPendingReviewSermons } from '../../lib/queries';
import AdminStatsPanel from '../../components/admin/AdminStatsPanel';
import IngestionRunList from '../../components/admin/IngestionRunList';
import { Check, ListChecks, PlusCircle, Radio } from 'lucide-react';

export default function Dashboard() {
  const posthog = usePostHog();
  const [shows, setShows] = useState([]);
  const [runs, setRuns] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSpotifyShows(),
      getIngestionRuns(5),
      getPendingReviewSermons(),
    ])
      .then(([s, r, p]) => {
        setShows(s);
        setRuns(r);
        setPendingCount(p.length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include',
    });
    posthog.reset();
    window.location.href = '/admin/login';
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
            >
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted font-ui mt-1">Manage your sermon catalogue</p>
          </div>
          <Link
            to="/"
            className="text-sm text-accent hover:text-primary font-ui transition-colors"
          >
            ← Public site
          </Link>
        </div>
        <div className="flex justify-end mb-6">
          <button
            onClick={handleLogout}
            className="text-xs font-ui text-muted hover:text-primary transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Stats */}
        <section className="mb-10">
          <AdminStatsPanel />
        </section>

        {/* Quick links */}
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/shows"
              className="flex items-center gap-3 p-5 bg-card-bg rounded-xl shadow-soft border border-amber-50 hover:shadow-card transition-all hover:-translate-y-0.5"
            >
              <Radio size={20} className="text-accent" />
              <div>
                <p className="font-medium text-text-main font-ui">Manage Shows</p>
                <p className="text-xs text-muted">{shows.length} tracked</p>
              </div>
            </Link>

            <Link
              to="/admin/review"
              className="flex items-center gap-3 p-5 bg-card-bg rounded-xl shadow-soft border border-amber-50 hover:shadow-card transition-all hover:-translate-y-0.5"
            >
              <ListChecks size={20} className="text-accent" />
              <div>
                <p className="font-medium text-text-main font-ui">Review Queue</p>
                <p className="text-xs text-muted">{pendingCount} pending</p>
              </div>
            </Link>

            <Link
              to="/admin/approved"
              className="flex items-center gap-3 p-5 bg-card-bg rounded-xl shadow-soft border border-amber-50 hover:shadow-card transition-all hover:-translate-y-0.5"
            >
              <Check size={20} className="text-accent" />
              <div>
                <p className="font-medium text-text-main font-ui">Approved Sermons</p>
                <p className="text-xs text-muted">Edit tags & metadata</p>
              </div>
            </Link>

            <Link
              to="/admin/themes"
              className="flex items-center gap-3 p-5 bg-card-bg rounded-xl shadow-soft border border-amber-50 hover:shadow-card transition-all hover:-translate-y-0.5"
            >
              <PlusCircle size={20} className="text-accent" />
              <div>
                <p className="font-medium text-text-main font-ui">Manage Themes</p>
                <p className="text-xs text-muted">Create new theme</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Recent runs */}
        <section>
          <h2
            className="text-lg font-bold mb-4"
            style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
          >
            Recent Ingestion Runs
          </h2>
          <IngestionRunList runs={runs} loading={loading} />
        </section>
      </div>
    </div>
  );
}
