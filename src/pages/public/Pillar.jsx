import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPillarBySlug, getSermonsByPillar } from '../../lib/queries';
import SermonList from '../../components/public/SermonList';
import { ArrowLeft } from 'lucide-react';

export default function Pillar() {
  const { slug } = useParams();
  const [pillar, setPillar] = useState(null);
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary font-ui mb-6 transition-colors"
          >
            <ArrowLeft size={14} />
            All Pillars
          </Link>

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
    </div>
  );
}
