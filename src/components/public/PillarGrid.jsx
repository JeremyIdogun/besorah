import PillarCard from './PillarCard';

export default function PillarGrid({ pillars }) {
  if (!pillars?.length) {
    return (
      <div className="text-center py-12 font-ui" style={{ color: '#8A6A4A' }}>
        No pillars found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
      {pillars.map((pillar) => (
        <PillarCard key={pillar.id} pillar={pillar} />
      ))}
    </div>
  );
}
