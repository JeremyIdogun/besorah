import { Link } from 'react-router-dom';

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
  const ctaLabel = platform === 'youtube' ? 'Watch' : 'Listen';
  const firstPillar = pillars[0];

  return (
    <div
      className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(58,24,6,0.09)]"
      style={{
        backgroundColor: '#FBF4E8',
        border: '1px solid rgba(180, 130, 70, 0.14)',
        borderRadius: 14,
        boxShadow: '0 2px 12px rgba(58, 24, 6, 0.06)',
      }}
    >
      {image_url ? (
        <img
          src={image_url}
          alt={title}
          className="w-full object-cover"
          style={{ height: 156 }}
        />
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            height: 156,
            background: 'repeating-linear-gradient(135deg, #E8D8C0 0px, #E8D8C0 14px, #DFCDB4 14px, #DFCDB4 28px)',
          }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#A08060' }}>
            sermon image
          </span>
        </div>
      )}

      <div style={{ padding: '16px 18px' }}>
        <Link to={`/sermon/${id}`}>
          <h3
            className="font-bold leading-[1.45] mb-2.5 line-clamp-2 hover:opacity-80 transition-opacity"
            style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#1A0E06', margin: '0 0 10px' }}
          >
            {title}
          </h3>
        </Link>

        <div className="flex flex-col gap-0.5 mb-3">
          {preacher && (
            <span className="font-ui text-xs font-medium" style={{ color: '#6A4A2A' }}>
              {preacher}
            </span>
          )}
          {(church || date_preached) && (
            <span className="font-ui text-[11px]" style={{ color: '#9A7A5A' }}>
              {[church, formatDate(date_preached)].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          {firstPillar && (
            <Link
              to={`/pillar/${firstPillar.slug}`}
              className="text-[11px] font-ui font-semibold px-2.5 py-0.5 rounded-full text-white hover:opacity-80 transition-opacity"
              style={{ backgroundColor: firstPillar.color }}
            >
              {firstPillar.name}
            </Link>
          )}
          {external_url && (
            <a
              href={external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-ui font-medium transition-colors hover:opacity-80"
              style={{ color: '#C17B3F' }}
            >
              {ctaLabel} →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
