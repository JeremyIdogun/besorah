import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSermonById } from '../../lib/queries';
import { ExternalLink, ChevronRight, Calendar, User, Church } from 'lucide-react';
import { useMeta } from '../../hooks/useMeta';

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SermonDetail() {
  const { id } = useParams();
  const [sermon, setSermon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const firstPillar = sermon?.sermon_pillars?.[0]?.pillars ?? null;
  useMeta({
    title: sermon?.title,
    description: sermon?.description?.slice(0, 160) || undefined,
    image: sermon?.image_url || undefined,
  });

  useEffect(() => {
    getSermonById(id)
      .then(setSermon)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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

            {/* Spotify CTA */}
            {sermon.external_url && (
              <a
                href={sermon.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-ui font-medium rounded-xl hover:bg-accent transition-colors mb-6"
              >
                <span>Listen on Spotify</span>
                <ExternalLink size={14} />
              </a>
            )}

            {/* Spotify embed */}
            {embedUrl && (
              <div className="rounded-xl overflow-hidden">
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title={sermon.title}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
