import { useEffect, useState } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { Search as SearchIcon, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { searchSermons, getPillars } from '../../lib/queries';
import SearchBar from '../../components/public/SearchBar';
import SermonList from '../../components/public/SermonList';
import { useMeta } from '../../hooks/useMeta';

const PAGE_SIZE = 20;

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const [sermons, setSermons] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [pillars, setPillars] = useState([]);
  const { pathname, search } = useLocation();

  useEffect(() => {
    getPillars().then(setPillars).catch(() => {});
  }, []);

  useMeta({
    title: q ? `Search: ${q}` : 'Search Sermons',
    url: `${window.location.origin}${pathname}${search}`,
  });

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    searchSermons(q, { page, pageSize: PAGE_SIZE })
      .then(({ sermons: results, total: count }) => {
        setSermons(results);
        setTotal(count);
      })
      .catch(() => setError('Search failed. Please try again.'))
      .finally(() => setLoading(false));
  }, [q, page]);

  function handleSearch(value) {
    setSearchParams({ q: value });
  }

  function goToPage(p) {
    setSearchParams({ q, page: String(p) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-background">
      <div className="py-12 px-4 sm:px-16 bg-surface" style={{ borderBottom: '1px solid rgba(180,130,70,0.14)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h1
            className="text-2xl font-bold mb-6"
            style={{ color: '#2A1004', fontFamily: 'Georgia, serif' }}
          >
            Search Sermons
          </h1>
          <SearchBar initialValue={q} onSearch={handleSearch} variant="light" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-16 py-10">
        {error && (
          <div className="rounded-[14px] bg-red-50 p-6 text-center mb-6" style={{ border: '1px solid rgba(180,130,70,0.14)' }}>
            <p className="text-sm text-red-800 font-ui mb-3">{error}</p>
            <button
              onClick={() => setSearchParams({ q, page: String(page) })}
              className="inline-flex items-center gap-2 text-sm font-ui font-medium text-red-700 hover:text-red-900 transition-colors"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {q && !error && (
          <p className="text-sm font-ui mb-6" style={{ color: '#8A6A4A' }}>
            {loading
              ? 'Searching…'
              : total === 0
              ? `No results for "${q}"`
              : `Showing ${from}–${to} of ${total} result${total !== 1 ? 's' : ''} for "${q}"`}
          </p>
        )}

        {q && !loading && !error && total === 0 && searched && (
          <div className="text-center py-10 font-ui" style={{ color: '#8A6A4A' }}>
            <p className="mb-4">No sermons matched your search.</p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/" className="text-sm text-accent hover:text-primary transition-colors">Browse by theme</Link>
              <span className="opacity-40">·</span>
              <button
                onClick={() => { setSearchParams({}); setSearched(false); setSermons([]); setTotal(0); }}
                className="text-sm text-accent hover:text-primary transition-colors"
              >
                Clear search
              </button>
            </div>
          </div>
        )}

        {!q && !searched && (
          <div className="text-center py-16 font-ui" style={{ color: '#8A6A4A' }}>
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-primary">
              <SearchIcon size={22} strokeWidth={2.2} aria-hidden="true" />
            </div>
            <p className="mb-6">Enter a search term above to find sermons.</p>
            {pillars.length > 0 && (
              <div>
                <p className="text-xs opacity-70 mb-3">Or browse by theme</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {pillars.map((p) => (
                    <Link
                      key={p.id}
                      to={`/pillar/${p.slug}`}
                      className="text-xs px-3 py-1.5 rounded-full text-white font-ui font-medium hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.icon ? `${p.icon} ${p.name}` : p.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {searched && <SermonList sermons={sermons} loading={loading} />}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => goToPage(1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-ui transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary"
              style={{ border: '1px solid rgba(180,130,70,0.14)', color: '#9A7A5A' }}
            >
              <ChevronLeft size={15} />
              <ChevronLeft size={15} className="-ml-2" />
            </button>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-ui transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary"
              style={{ border: '1px solid rgba(180,130,70,0.14)', color: '#9A7A5A' }}
            >
              <ChevronLeft size={15} />
              Prev
            </button>
            <span className="text-sm font-ui px-2" style={{ color: '#9A7A5A' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-ui transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary"
              style={{ border: '1px solid rgba(180,130,70,0.14)', color: '#9A7A5A' }}
            >
              Next
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-ui transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary"
              style={{ border: '1px solid rgba(180,130,70,0.14)', color: '#9A7A5A' }}
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
