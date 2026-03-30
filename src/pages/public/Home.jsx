import { useEffect, useState } from 'react';
import { getPillars, getLatestSermons } from '../../lib/queries';
import PillarGrid from '../../components/public/PillarGrid';
import SearchBar from '../../components/public/SearchBar';
import SermonList from '../../components/public/SermonList';

export default function Home() {
  const [pillars, setPillars] = useState([]);
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPillars(), getLatestSermons(6)])
      .then(([p, s]) => {
        setPillars(p);
        setLatest(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div
        className="relative py-20 px-4 text-center"
        style={{
          background: 'linear-gradient(135deg, #FAF6F0 0%, #F5EBE0 50%, #FAF6F0 100%)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <p className="text-4xl mb-4">✝</p>
          <h1
            className="text-4xl md:text-5xl font-bold mb-4 leading-tight"
            style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
          >
            Euangelion
          </h1>
          <p
            className="text-lg mb-2 font-normal italic"
            style={{ color: '#A0856B', fontFamily: 'Georgia, serif' }}
          >
            εὐαγγέλιον — Good News, Organised by Theme
          </p>
          <p className="text-base text-muted font-ui mb-8 max-w-md mx-auto">
            Discover Christian sermons curated by theme. Find preaching that speaks to where you are.
          </p>
          <SearchBar />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Pillars */}
        <section className="mb-14">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
          >
            Browse by Theme
          </h2>
          <p className="text-muted text-sm font-ui mb-6">
            Ten pillars of faith — choose a theme to explore sermons.
          </p>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-36 bg-card-bg rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <PillarGrid pillars={pillars} />
          )}
        </section>

        {/* Latest */}
        {(latest.length > 0 || loading) && (
          <section>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
            >
              Recently Added
            </h2>
            <p className="text-muted text-sm font-ui mb-6">
              Freshly imported sermons across all themes.
            </p>
            <SermonList sermons={latest} loading={loading} />
          </section>
        )}
      </div>
    </div>
  );
}
