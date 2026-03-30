import { useEffect, useState } from 'react';
import { getAdminPillars, getPillars } from '../../lib/queries';

export default function TagSelector({
  selected = [],
  onChange,
  pillars: providedPillars = null,
  source = 'public',
}) {
  const [pillars, setPillars] = useState([]);

  useEffect(() => {
    if (Array.isArray(providedPillars)) {
      setPillars(providedPillars);
      return;
    }

    const loader = source === 'admin' ? getAdminPillars : getPillars;
    loader().then(setPillars).catch(console.error);
  }, [providedPillars, source]);

  function toggle(id) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {pillars.map((p) => {
        const active = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className="text-xs px-3 py-1.5 rounded-full font-ui font-medium transition-all border-2"
            style={{
              backgroundColor: active ? p.color : 'transparent',
              borderColor: p.color,
              color: active ? '#fff' : p.color,
            }}
          >
            {p.icon ? `${p.icon} ${p.name}` : p.name}
          </button>
        );
      })}
    </div>
  );
}
