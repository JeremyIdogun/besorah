import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { searchSermons } from '../../lib/queries';
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

  useMeta({
    title: q ? `Search: ${q}` : 'Search Sermons',
  });

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setSearched(true);
    searchSermons(q, { page, pageSize: PAGE_SIZE })
      .then(({ sermons: results, total: count }) => {
        setSermons(results);
        setTotal(count);
      })
      .catch(console.error)
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
      <div className="py-12 px-4 bg-card-bg border-b border-amber-100">
        <div className="max-w-2xl mx-auto text-center">
          <h1
            className="text-2xl font-bold mb-6"
            style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
          >
            Search Sermons
          </h1>
          <SearchBar initialValue={q} onSearch={handleSearch} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {q && (
          <p className="text-sm text-muted font-ui mb-6">
            {loading
              ? 'Searching…'
              : total === 0
              ? `No results for "${q}"`
              : `Showing ${from}–${to} of ${total} result${total !== 1 ? 's' : ''} for "${q}"`}
          </p>
        )}

        {!q && !searched && (
          <div className="text-center py-16 text-muted font-ui">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-primary">
              <SearchIcon size={22} strokeWidth={2.2} aria-hidden="true" />
            </div>
            <p>Enter a search term above to find sermons.</p>
          </div>
        )}

        {searched && <SermonList sermons={sermons} loading={loading} />}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
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
          </div>
        )}
      </div>
    </div>
  );
}
