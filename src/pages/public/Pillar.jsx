import { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import { getPillarBySlug, getSermonsByPillar } from '../../lib/queries';
import SermonList from '../../components/public/SermonList';
import { ChevronRight, ArrowUp, ChevronLeft } from 'lucide-react';
import { useMeta } from '../../hooks/useMeta';

const PAGE_SIZE = 24;

export default function Pillar() {
  const { slug } = useParams();
  const { pathname, search } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const [pillar, setPillar] = useState(null);
  const [sermons, setSermons] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useMeta({
    title: pillar?.name,
    description: pillar?.description
      ? `${pillar.description} Browse ${total} sermon${total === 1 ? '' : 's'} on ${pillar.name}.`
      : undefined,
    url: `${window.location.origin}${pathname}${search}`,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPillarBySlug(slug)
      .then(async (p) => {
        setPillar(p);
        const { sermons: results, total: count } = await getSermonsByPillar(p.id, {
          page,
          pageSize: PAGE_SIZE,
        });
        const lastPage = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
        if (page > lastPage) {
          setSearchParams(lastPage === 1 ? {} : { page: String(lastPage) }, { replace: true });
          return;
        }

        setSermons(results);
        setTotal(count);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, page, setSearchParams]);

  function goToPage(nextPage) {
    setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-muted font-ui">Pillar not found.</p>
        <Link to="/" className="text-accent text-sm font-ui hover:text-primary">← Back home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="py-14 px-4"
        style={{
          background: pillar
            ? `linear-gradient(135deg, ${pillar.color}18 0%, #FAF6F0 100%)`
            : '#FAF6F0',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center gap-1 text-sm font-ui text-muted mb-6">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight size={13} className="flex-shrink-0" />
            <span className="text-text-main">{pillar?.name ?? 'Pillar'}</span>
          </nav>

          {loading ? (
            <div className="h-10 w-48 bg-amber-100 rounded-lg animate-pulse" />
          ) : pillar ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h1
                  className="text-3xl md:text-4xl font-bold"
                  style={{ color: pillar.color, fontFamily: 'Georgia, serif' }}
                >
                  {pillar.name}
                </h1>
              </div>
              <p className="text-muted font-ui max-w-xl">{pillar.description}</p>
            </>
          ) : null}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {!loading && pillar && (
          <p className="text-sm text-muted font-ui mb-6">
            {total === 0
              ? 'No sermons in this pillar yet.'
              : `Showing ${from}–${to} of ${total} sermon${total !== 1 ? 's' : ''}`}
          </p>
        )}
        <SermonList sermons={sermons} loading={loading} />

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
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

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-card hover:bg-accent transition-colors"
          aria-label="Back to top"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}
