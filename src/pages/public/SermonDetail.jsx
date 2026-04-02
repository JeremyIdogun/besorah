import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getSermonById, getRelatedSermons, logSermonView } from '../../lib/queries';
import { ExternalLink, ChevronRight, Calendar, User, Church, Video, Headphones, Share2, Check } from 'lucide-react';
import SermonCard from '../../components/public/SermonCard';
import { useMeta } from '../../hooks/useMeta';

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SermonDetail() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const [sermon, setSermon] = useState(null);
  const [related, setRelated] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const firstPillar = sermon?.sermon_pillars?.[0]?.pillars ?? null;
  useMeta({
    title: sermon?.title,
    description: sermon?.description?.slice(0, 160) || undefined,
    image: sermon?.image_url || undefined,
    url: `${window.location.origin}${pathname}`,
  });

  useEffect(() => {
    setLoading(true);
    setRelated([]);
    getSermonById(id)
      .then((s) => {
        setSermon(s);
        const pillarId = s?.sermon_pillars?.[0]?.pillar_id;
        if (pillarId) {
          setRelatedLoading(true);
          getRelatedSermons(s.id, pillarId, 3)
            .then(setRelated)
            .catch(() => {})
            .finally(() => setRelatedLoading(false));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Log page view (fire-and-forget)
    void logSermonView(id, 'page_view');
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <div className="h-8 w-64 bg-amber-100 rounded-lg animate-pulse" />
        <div className="h-48 bg-amber-50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !sermon) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-muted font-ui mb-4">Sermon not found.</p>
        <Link to="/" className="text-accent text-sm font-ui hover:text-primary">← Back home</Link>
      </div>
    );
  }

  const pillars = sermon.sermon_pillars?.map((sp) => sp.pillars).filter(Boolean) ?? [];
  const embedUrl = sermon.embed_url || (sermon.spotify_episode_id
    ? `https://open.spotify.com/embed/episode/${sermon.spotify_episode_id}`
    : null);
  const platform = (sermon.platform || '').toLowerCase();
  const externalCtaLabel = platform === 'youtube'
    ? 'Watch on YouTube'
    : platform === 'spotify'
      ? 'Listen on Spotify'
      : 'Open Source';
  const CtaIcon = platform === 'youtube'
    ? Video
    : platform === 'spotify'
      ? Headphones
      : ExternalLink;
  const isYouTube = sermon.platform === 'youtube';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <nav className="flex items-center gap-1 text-sm font-ui text-muted mb-8 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          {firstPillar && (
            <>
              <ChevronRight size={13} className="flex-shrink-0" />
              <Link to={`/pillar/${firstPillar.slug}`} className="hover:text-primary transition-colors">
                {firstPillar.name}
              </Link>
            </>
          )}
          <ChevronRight size={13} className="flex-shrink-0" />
          <span className="text-text-main line-clamp-1">{sermon.title}</span>
        </nav>

        <div className="bg-card-bg rounded-2xl shadow-card border border-amber-50 overflow-hidden">
          {sermon.image_url && (
            <img
              src={sermon.image_url}
              alt={sermon.title}
              className="w-full h-56 object-cover"
            />
          )}

          <div className="p-8">
            {/* Platform badge */}
            <span className="inline-block text-xs font-ui font-medium px-3 py-1 bg-green-100 text-green-800 rounded-full mb-4 uppercase tracking-wide">
              {sermon.platform}
            </span>

            <h1
              className="text-2xl md:text-3xl font-bold mb-5 leading-snug"
              style={{ color: '#2C1A0E', fontFamily: 'Georgia, serif' }}
            >
              {sermon.title}
            </h1>

            <div className="space-y-2 mb-6">
              {sermon.preacher && (
                <div className="flex items-center gap-2 text-sm text-muted font-ui">
                  <User size={14} />
                  <span>{sermon.preacher}</span>
                </div>
              )}
              {sermon.church && (
                <div className="flex items-center gap-2 text-sm text-muted font-ui">
                  <Church size={14} />
                  <span>{sermon.church}</span>
                </div>
              )}
              {sermon.date_preached && (
                <div className="flex items-center gap-2 text-sm text-muted font-ui">
                  <Calendar size={14} />
                  <span>{formatDate(sermon.date_preached)}</span>
                </div>
              )}
            </div>

            {/* Pillar tags */}
            {pillars.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {pillars.map((p) => (
                  <Link
                    key={p.id}
                    to={`/pillar/${p.slug}`}
                    className="text-sm px-3 py-1 rounded-full text-white font-ui font-medium hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.icon ? `${p.icon} ${p.name}` : p.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Description */}
            {sermon.description && (
              <p className="text-sm text-muted font-ui leading-relaxed mb-8 whitespace-pre-line">
                {sermon.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {sermon.external_url && (
                <a
                  href={sermon.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { void logSermonView(sermon.id, 'cta_click'); }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-ui font-medium rounded-xl hover:bg-accent transition-colors"
                >
                  <span>{externalCtaLabel}</span>
                  <CtaIcon size={14} />
                </a>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-3 border border-amber-200 text-sm font-ui font-medium text-muted rounded-xl hover:text-primary hover:border-primary transition-colors"
              >
                {copied ? <Check size={14} /> : <Share2 size={14} />}
                {copied ? 'Link copied!' : 'Share'}
              </button>
            </div>

            {/* Platform embed */}
            {embedUrl && (
              isYouTube ? (
                <div className="rounded-xl overflow-hidden" style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={embedUrl}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title={sermon.title}
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden">
                  <iframe
                    src={embedUrl}
                    width="100%"
                    height={152}
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media"
                    loading="lazy"
                    title={sermon.title}
                  />
                </div>
              )
            )}
          </div>
        </div>

        {/* Related sermons */}
        {(relatedLoading || related.length > 0) && firstPillar && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-bold"
                style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
              >
                More in {firstPillar.name}
              </h2>
              <Link
                to={`/pillar/${firstPillar.slug}`}
                className="text-sm font-ui text-accent hover:text-primary transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-card-bg rounded-2xl overflow-hidden border border-amber-50">
                      <div className="h-36 bg-amber-100 animate-pulse" />
                      <div className="p-5 space-y-3">
                        <div className="h-4 w-3/4 bg-amber-100 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-amber-50 rounded animate-pulse" />
                        <div className="h-3 w-1/3 bg-amber-50 rounded animate-pulse" />
                      </div>
                    </div>
                  ))
                : related.map((s) => {
                    const sPillars = s.sermon_pillars?.map((sp) => sp.pillars).filter(Boolean) ?? [];
                    return <SermonCard key={s.id} sermon={s} pillars={sPillars} />;
                  })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
