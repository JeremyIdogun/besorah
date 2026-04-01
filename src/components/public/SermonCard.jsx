import { Link } from 'react-router-dom';
import { ExternalLink, Calendar, User, Church, Video, Headphones } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SermonCard({ sermon, pillars = [] }) {
  const { id, title, preacher, church, date_preached, image_url, external_url } = sermon;
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

  return (
    <div className="bg-card-bg rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-all duration-200 hover:-translate-y-0.5 border border-amber-50">
      {image_url && (
        <img
          src={image_url}
          alt={title}
          className="w-full h-36 object-cover"
        />
      )}

      <div className="p-5">
        <Link to={`/sermon/${id}`}>
          <h3 className="font-bold text-text-main hover:text-primary transition-colors leading-snug mb-2 line-clamp-2" style={{ fontFamily: 'Georgia, serif' }}>
            {title}
          </h3>
        </Link>

        <div className="space-y-1 mb-3">
          {preacher && (
            <div className="flex items-center gap-1.5 text-xs text-muted font-ui">
              <User size={11} />
              <span>{preacher}</span>
            </div>
          )}
          {church && (
            <div className="flex items-center gap-1.5 text-xs text-muted font-ui">
              <Church size={11} />
              <span>{church}</span>
            </div>
          )}
          {date_preached && (
            <div className="flex items-center gap-1.5 text-xs text-muted font-ui">
              <Calendar size={11} />
              <span>{formatDate(date_preached)}</span>
            </div>
          )}
        </div>

        {pillars.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {pillars.map((p) => (
              <Link
                key={p.id}
                to={`/pillar/${p.slug}`}
                className="text-xs px-2 py-0.5 rounded-full text-white font-ui font-medium hover:opacity-80 transition-opacity"
                style={{ backgroundColor: p.color }}
              >
                {p.name}
              </Link>
            ))}
          </div>
        )}

        {external_url && (
          <a
            href={external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-primary font-ui font-medium transition-colors"
          >
            <span>{externalCtaLabel}</span>
            <CtaIcon size={11} />
          </a>
        )}
      </div>
    </div>
  );
}
