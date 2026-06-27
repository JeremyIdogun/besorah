import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import SermonCard from './SermonCard';

export default function SermonList({ sermons, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-[14px] h-72 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!sermons?.length) {
    return (
      <div className="text-center py-16 font-ui" style={{ color: '#8A6A4A' }}>
        <BookOpen size={28} className="mx-auto mb-3 opacity-60" />
        <p className="mb-4">No sermons found.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="text-sm text-accent hover:text-primary transition-colors">Browse by theme</Link>
          <span className="opacity-40">·</span>
          <Link to="/search" className="text-sm text-accent hover:text-primary transition-colors">Try a search</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {sermons.map((sermon) => {
        const pillars = sermon.sermon_pillars?.map((sp) => sp.pillars).filter(Boolean) ?? [];
        return <SermonCard key={sermon.id} sermon={sermon} pillars={pillars} />;
      })}
    </div>
  );
}
