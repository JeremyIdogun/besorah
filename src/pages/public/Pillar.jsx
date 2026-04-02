import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getPillarBySlug, getSermonsByPillar } from '../../lib/queries';
import SermonList from '../../components/public/SermonList';
import { ChevronRight, ArrowUp } from 'lucide-react';
import { useMeta } from '../../hooks/useMeta';

export default function Pillar() {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const [pillar, setPillar] = useState(null);
  const [sermons, setSermons] = useState([]);
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
      ? `${pillar.description} Browse ${sermons.length} sermons on ${pillar.name}.`
      : undefined,
    url: `${window.location.origin}${pathname}`,
  });

  useEffect(() => {
    setLoading(true);
    getPillarBySlug(slug)
      .then(async (p) => {
        setPillar(p);
        const s = await getSermonsByPillar(p.id);
        setSermons(s);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

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
            {sermons.length} sermon{sermons.length !== 1 ? 's' : ''} in this pillar
          </p>
        )}
        <SermonList sermons={sermons} loading={loading} />
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
