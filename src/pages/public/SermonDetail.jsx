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
  // Results are stored with the id/sermon they belong to, so a slow response
  // for a previous sermon can never be shown under the current URL.
  const [sermonState, setSermonState] = useState({ id: null, sermon: null, error: null });
  const [relatedState, setRelatedState] = useState({ sermonId: null, sermons: [] });
  const [copied, setCopied] = useState(false);

  const loading = sermonState.id !== id;
  const sermon = loading ? null : sermonState.sermon;
  const error = loading ? null : sermonState.error;
  const sermonId = sermon?.id ?? null;
  const relatedPillarId = sermon?.sermon_pillars?.[0]?.pillar_id ?? null;
  const relatedLoading = Boolean(relatedPillarId) && relatedState.sermonId !== sermonId;
  const related = relatedState.sermonId === sermonId ? relatedState.sermons : [];

  const firstPillar = sermon?.sermon_pillars?.[0]?.pillars ?? null;
  useMeta({
    title: sermon?.title,
    description: sermon?.description?.slice(0, 160) || undefined,
    image: sermon?.image_url || undefined,
    url: `${window.location.origin}${pathname}`,
  });

  useEffect(() => {
    let cancelled = false;
    getSermonById(id)
      .then((s) => {
        if (!cancelled) setSermonState({ id, sermon: s, error: null });
      })
      .catch((err) => {
        if (!cancelled) setSermonState({ id, sermon: null, error: err.message });
      });

    void logSermonView(id, 'page_view');
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!sermonId || !relatedPillarId) return undefined;
    let cancelled = false;
    getRelatedSermons(sermonId, relatedPillarId, 3)
      .then((results) => {
        if (!cancelled) setRelatedState({ sermonId, sermons: results });
      })
      .catch(() => {
        if (!cancelled) setRelatedState({ sermonId, sermons: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [sermonId, relatedPillarId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-16 py-12 space-y-4">
        <div className="h-8 w-64 bg-surface rounded-lg animate-pulse" />
        <div className="h-48 bg-surface rounded-[14px] animate-pulse" />
      </div>
    );
  }

  if (error || !sermon) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-16 py-16 text-center">
        <p className="font-ui mb-4" style={{ color: '#8A6A4A' }}>Sermon not found.</p>
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
      <div className="max-w-3xl mx-auto px-4 sm:px-16 py-10">
        <nav className="flex items-center gap-1 text-sm font-ui mb-8 flex-wrap" style={{ color: '#9A7A5A' }}>
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
          <span className="line-clamp-1" style={{ color: '#1A0E06' }}>{sermon.title}</span>
        </nav>

        <div
          className="overflow-hidden"
          style={{
            backgroundColor: '#FBF4E8',
            border: '1px solid rgba(180, 130, 70, 0.14)',
            borderRadius: 14,
            boxShadow: '0 2px 12px rgba(58, 24, 6, 0.06)',
          }}
        >
          {sermon.image_url && (
            <img
              src={sermon.image_url}
              alt={sermon.title}
              className="w-full h-56 object-cover"
            />
          )}

          <div className="p-8">
            <span
              className="inline-block text-xs font-ui font-medium px-3 py-1 bg-green-100 text-green-800 rounded-full mb-4 uppercase tracking-wide"
            >
              {sermon.platform}
            </span>

            <h1
              className="text-2xl md:text-3xl font-bold mb-5 leading-snug"
              style={{ color: '#1A0E06', fontFamily: 'Georgia, serif' }}
            >
              {sermon.title}
            </h1>

            <div className="space-y-2 mb-6">
              {sermon.preacher && (
                <div className="flex items-center gap-2 text-sm font-ui" style={{ color: '#9A7A5A' }}>
                  <User size={14} />
                  <span>{sermon.preacher}</span>
                </div>
              )}
              {sermon.church && (
                <div className="flex items-center gap-2 text-sm font-ui" style={{ color: '#9A7A5A' }}>
                  <Church size={14} />
                  <span>{sermon.church}</span>
                </div>
              )}
              {sermon.date_preached && (
                <div className="flex items-center gap-2 text-sm font-ui" style={{ color: '#9A7A5A' }}>
                  <Calendar size={14} />
                  <span>{formatDate(sermon.date_preached)}</span>
                </div>
              )}
            </div>

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

            {sermon.description && (
              <p className="text-sm font-ui leading-relaxed mb-8 whitespace-pre-line" style={{ color: '#8A6A4A' }}>
                {sermon.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-6">
              {sermon.external_url && (
                <a
                  href={sermon.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { void logSermonView(sermon.id, 'cta_click'); }}
                  className="inline-flex items-center gap-2 px-6 py-3 text-white font-ui font-medium rounded-full hover:bg-accent transition-colors"
                  style={{ backgroundColor: '#2A1004' }}
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
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-ui font-medium rounded-full hover:text-primary transition-colors"
                style={{ border: '1px solid rgba(180,130,70,0.14)', color: '#9A7A5A' }}
              >
                {copied ? <Check size={14} /> : <Share2 size={14} />}
                {copied ? 'Link copied!' : 'Share'}
              </button>
            </div>

            {embedUrl && (
              isYouTube ? (
                <div className="rounded-[14px] overflow-hidden" style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
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
                <div className="rounded-[14px] overflow-hidden">
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

        {(relatedLoading || related.length > 0) && firstPillar && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-bold"
                style={{ color: '#2A1004', fontFamily: 'Georgia, serif' }}
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
                    <div key={i} className="bg-surface rounded-[14px] overflow-hidden" style={{ border: '1px solid rgba(180,130,70,0.14)' }}>
                      <div className="h-[156px] bg-background animate-pulse" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 w-3/4 bg-background rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-background rounded animate-pulse" />
                        <div className="h-3 w-1/3 bg-background rounded animate-pulse" />
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
