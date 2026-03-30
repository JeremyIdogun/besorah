import { Link } from 'react-router-dom';

export default function PillarCard({ pillar }) {
  const { name, slug, description, color, sermon_count } = pillar;

  return (
    <Link
      to={`/pillar/${slug}`}
      className="group block bg-card-bg rounded-2xl p-6 shadow-soft hover:shadow-card transition-all duration-200 hover:-translate-y-0.5 border border-amber-50"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-ui font-medium uppercase tracking-wide text-muted">
          Theme
        </span>
        <span
          className="text-xs font-ui font-medium px-2 py-1 rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {sermon_count ?? 0} sermons
        </span>
      </div>

      <h3
        className="text-lg font-bold mb-1 group-hover:opacity-80 transition-opacity"
        style={{ color: color, fontFamily: 'Georgia, serif' }}
      >
        {name}
      </h3>

      <p className="text-sm text-muted leading-relaxed line-clamp-2">{description}</p>

      <div
        className="mt-4 h-0.5 w-8 rounded-full opacity-60 group-hover:w-12 transition-all duration-300"
        style={{ backgroundColor: color }}
      />
    </Link>
  );
}
