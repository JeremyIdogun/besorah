import { Link } from 'react-router-dom';

export default function PillarCard({ pillar }) {
  const { name, slug, description, color, sermon_count } = pillar;

  return (
    <Link
      to={`/pillar/${slug}`}
      className="group block transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(58,24,6,0.09)]"
      style={{
        backgroundColor: '#FBF4E8',
        border: '1px solid rgba(180, 130, 70, 0.14)',
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div className="flex justify-end mb-2.5">
        <span
          className="text-[11px] font-ui font-semibold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {sermon_count ?? 0}
        </span>
      </div>

      <span
        className="block font-bold mb-1.5"
        style={{ color, fontFamily: 'Georgia, serif', fontSize: 16 }}
      >
        {name}
      </span>

      <p
        className="text-xs font-ui leading-[1.55] line-clamp-2 m-0"
        style={{ color: '#8A6A4A' }}
      >
        {description}
      </p>

      <div
        className="mt-4 rounded-sm"
        style={{ width: 32, height: 2, backgroundColor: color }}
      />
    </Link>
  );
}
