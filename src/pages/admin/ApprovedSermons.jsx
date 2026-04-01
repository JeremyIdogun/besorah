import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getApprovedSermons } from '../../lib/queries';

const PAGE_SIZE = 50;

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ApprovedSermons() {
  const [sermons, setSermons] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getApprovedSermons({ page, pageSize: PAGE_SIZE })
      .then(({ sermons: results, total: count }) => {
        setSermons(results);
        setTotal(count);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sermons;
    return sermons.filter((sermon) => (
      [sermon.title, sermon.preacher, sermon.church]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    ));
  }, [sermons, query]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  function goToPage(p) {
    setPage(p);
    setQuery('');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary font-ui mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
            >
              Approved Sermons
            </h1>
            <p className="text-sm text-muted font-ui mt-1">
              Edit titles, tags, preacher, and church for already approved sermons.
            </p>
          </div>
          {!loading && total > 0 && (
            <p className="text-sm text-muted font-ui">
              {query ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''} on this page` : `${from}–${to} of ${total}`}
            </p>
          )}
        </div>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter this page by title, preacher, or church"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-amber-200 bg-white text-sm font-ui focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 font-ui mb-4">{error}</p>
        )}

        <div className="bg-card-bg rounded-2xl p-4 sm:p-6 shadow-soft border border-amber-50">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-amber-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !filtered.length ? (
            <div className="text-center py-10 text-muted font-ui">
              No approved sermons found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-ui">
                <thead>
                  <tr className="border-b border-amber-100 text-left">
                    <th className="py-2 pr-4 text-muted font-medium">Title</th>
                    <th className="py-2 pr-4 text-muted font-medium hidden sm:table-cell">Preacher</th>
                    <th className="py-2 pr-4 text-muted font-medium hidden md:table-cell">Church</th>
                    <th className="py-2 pr-4 text-muted font-medium hidden lg:table-cell">Updated</th>
                    <th className="py-2 text-muted font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sermon) => (
                    <tr key={sermon.id} className="border-b border-amber-50 hover:bg-amber-50/50 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="font-medium text-text-main line-clamp-1">{sermon.title}</span>
                      </td>
                      <td className="py-3 pr-4 hidden sm:table-cell text-muted">{sermon.preacher || '—'}</td>
                      <td className="py-3 pr-4 hidden md:table-cell text-muted">{sermon.church || '—'}</td>
                      <td className="py-3 pr-4 hidden lg:table-cell text-muted">{formatDate(sermon.updated_at || sermon.created_at)}</td>
                      <td className="py-3">
                        <Link
                          to={`/admin/sermons/${sermon.id}?returnTo=approved`}
                          className="inline-flex items-center gap-1 text-xs text-accent hover:text-primary font-medium transition-colors"
                        >
                          Edit Sermon
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => goToPage(1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-200 text-sm font-ui text-muted hover:text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} />
              <ChevronLeft size={15} className="-ml-2" />
            </button>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-200 text-sm font-ui text-muted hover:text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} />
              Prev
            </button>
            <span className="text-sm font-ui text-muted px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-200 text-sm font-ui text-muted hover:text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-200 text-sm font-ui text-muted hover:text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={15} />
              <ChevronRight size={15} className="-ml-2" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
