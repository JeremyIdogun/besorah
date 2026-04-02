import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { getPillars, getLatestSermons, getPopularSermons } from '../../lib/queries';
import PillarGrid from '../../components/public/PillarGrid';
import SearchBar from '../../components/public/SearchBar';
import SermonList from '../../components/public/SermonList';
import { useMeta } from '../../hooks/useMeta';

export default function Home() {
  const { pathname } = useLocation();
  useMeta({ url: `${window.location.origin}${pathname}` });
  const [pillars, setPillars] = useState([]);
  const [latest, setLatest] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    const [pillarsResult, latestResult, popularResult] = await Promise.allSettled([
      getPillars(),
      getLatestSermons(6),
      getPopularSermons(3),
    ]);

    const pillarsOk = pillarsResult.status === 'fulfilled';
    const latestOk = latestResult.status === 'fulfilled';

    setPillars(pillarsOk ? pillarsResult.value : []);
    setLatest(latestOk ? latestResult.value : []);
    setPopular(popularResult.status === 'fulfilled' ? popularResult.value : []);

    if (!pillarsOk || !latestOk) {
      setError('Some content could not load. Please try again.');
    }

    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div
        className="relative py-7 px-4 text-center"
        style={{
          background: 'linear-gradient(135deg, #FAF6F0 0%, #F5EBE0 50%, #FAF6F0 100%)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <img
            src="/branding/besorah_primary_logo.svg"
            alt="Besorah — Good News, Organised by Theme"
            className="h-[4.5rem] sm:h-[5.5rem] md:h-24 w-auto mx-auto mb-3"
          />
          <p
            className="text-base mb-2 font-normal italic"
            style={{ color: '#A0856B', fontFamily: 'Georgia, serif' }}
          >
            בְּשׂוֹרָה — Good News, Organised by Theme
          </p>
          <p className="text-base text-muted font-ui mb-5 max-w-md mx-auto">
            Discover Christian sermons curated by theme. Find preaching that speaks to where you are.
          </p>
          <SearchBar />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {error && (
          <div className="mb-10 rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-800 font-ui mb-3">{error}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 text-sm font-ui font-medium text-red-700 hover:text-red-900 transition-colors"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        <section className="mb-10 rounded-2xl border border-amber-100 bg-white/90 p-6 sm:p-8 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p
              className="text-xl sm:text-2xl font-bold"
              style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
            >
              New to the faith? Start here.
            </p>
            <Link
              to="/pillar/salvation"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-white text-sm font-ui font-medium rounded-full hover:bg-accent transition-colors"
            >
              Start Here
            </Link>
          </div>
        </section>

        {/* Pillars */}
        <section className="mb-14">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
          >
            Browse by Theme
          </h2>
          <p className="text-muted text-sm font-ui mb-6">
            Explore our core themes and choose one to dive into sermons.
          </p>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-36 bg-card-bg rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <PillarGrid pillars={pillars} />
          )}
        </section>

        {/* Popular */}
        {popular.length > 0 && (
          <section className="mb-14">
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
            >
              Popular Sermons
            </h2>
            <p className="text-muted text-sm font-ui mb-6">
              Most listened-to and watched sermons on Besorah.
            </p>
            <SermonList sermons={popular} loading={false} />
          </section>
        )}

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
