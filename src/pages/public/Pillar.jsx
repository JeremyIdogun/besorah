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
  // Results are tagged with the slug/page they answer. Loading is derived from
  // that, and the previous page's data stays visible for the same pillar
  // while the next page loads.
  const requestKey = `${slug}|${page}`;
  const [result, setResult] = useState({ key: null, slug: null, pillar: null, sermons: [], total: 0, error: null });
  const loading = result.key !== requestKey;
  const samePillar = result.slug === slug;
  const pillar = samePillar ? result.pillar : null;
  const sermons = samePillar ? result.sermons : [];
  const total = samePillar ? result.total : 0;
  const error = loading ? null : result.error;
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
    let cancelled = false;
    getPillarBySlug(slug)
      .then(async (p) => {
        const { sermons: results, total: count } = await getSermonsByPillar(p.id, {
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        const lastPage = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
        if (page > lastPage) {
          // Changing the URL changes requestKey, which triggers the next load.
          setSearchParams(lastPage === 1 ? {} : { page: String(lastPage) }, { replace: true });
          return;
        }

        setResult({ key: requestKey, slug, pillar: p, sermons: results, total: count, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({ key: requestKey, slug, pillar: null, sermons: [], total: 0, error: err.message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, page, requestKey, setSearchParams]);

  function goToPage(nextPage) {
    setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-16 py-16 text-center">
        <p className="font-ui" style={{ color: '#8A6A4A' }}>Pillar not found.</p>
        <Link to="/" className="text-accent text-sm font-ui hover:text-primary">← Back home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="py-14 px-4 sm:px-16"
        style={{
          background: pillar
            ? `linear-gradient(135deg, ${pillar.color}18 0%, #EAE0D0 100%)`
            : '#EAE0D0',
        }}
      >
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-1 text-sm font-ui mb-6" style={{ color: '#9A7A5A' }}>
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight size={13} className="flex-shrink-0" />
            <span style={{ color: '#1A0E06' }}>{pillar?.name ?? 'Pillar'}</span>
          </nav>

          {loading ? (
            <div className="h-10 w-48 bg-surface rounded-lg animate-pulse" />
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
              <p className="font-ui max-w-xl" style={{ color: '#8A6A4A' }}>{pillar.description}</p>
            </>
          ) : null}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-16 py-10">
        {!loading && pillar && (
          <p className="text-sm font-ui mb-6" style={{ color: '#8A6A4A' }}>
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

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full text-white shadow-card hover:bg-accent transition-colors"
          style={{ backgroundColor: '#2A1004' }}
          aria-label="Back to top"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}
