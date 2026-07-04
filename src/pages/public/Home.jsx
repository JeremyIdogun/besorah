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
        className="text-center px-6 sm:px-16"
        style={{
          background: 'linear-gradient(140deg, #2A1004 0%, #4E1C08 55%, #3A1806 100%)',
          paddingTop: 80,
          paddingBottom: 80,
        }}
      >
        <div className="max-w-2xl mx-auto">
          <img
            src="/branding/besorah_primary_logo.svg"
            alt="Besorah — Good News, Organised by Theme"
            className="w-auto mx-auto mb-6"
            style={{ height: 148 }}
          />
          <p
            className="italic mb-3"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 15,
              color: '#D4A017',
              letterSpacing: '0.08em',
            }}
          >
            בְּשׂוֹרָה · Good News, Organised by Theme
          </p>
          <p
            className="font-ui mx-auto mb-10"
            style={{
              fontSize: 16,
              color: '#C8B090',
              maxWidth: 440,
              lineHeight: 1.65,
            }}
          >
            Discover Christian sermons curated by theme. Find preaching that speaks to where you are in your faith journey.
          </p>
          <SearchBar variant="dark" />
          <p className="font-ui mt-5" style={{ fontSize: 13, color: 'rgba(200,176,144,0.55)' }}>
            New to the faith?{' '}
            <Link
              to="/pillar/salvation"
              className="underline"
              style={{ color: '#D4A017', textUnderlineOffset: 3 }}
            >
              Start with Salvation →
            </Link>
          </p>
        </div>
      </div>

      {/* Content sections */}
      <div className="max-w-6xl mx-auto px-6 sm:px-16 pt-14 pb-20">
        {error && (
          <div className="mb-12 rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
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

        {/* Pillars */}
        <section className="mb-16">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: '#2A1004', fontFamily: 'Georgia, serif' }}
          >
            Browse by Theme
          </h2>
          <p className="text-sm font-ui mb-7" style={{ color: '#8A6A4A' }}>
            Explore our core themes and choose one to dive into sermons.
          </p>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-36 bg-surface rounded-[14px] animate-pulse" />
              ))}
            </div>
          ) : (
            <PillarGrid pillars={pillars} />
          )}
        </section>

        {/* Popular */}
        {popular.length > 0 && (
          <section className="mb-16">
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: '#2A1004', fontFamily: 'Georgia, serif' }}
            >
              Popular Sermons
            </h2>
            <p className="text-sm font-ui mb-7" style={{ color: '#8A6A4A' }}>
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
              style={{ color: '#2A1004', fontFamily: 'Georgia, serif' }}
            >
              Recently Added
            </h2>
            <p className="text-sm font-ui mb-7" style={{ color: '#8A6A4A' }}>
              Freshly imported sermons across all themes.
            </p>
            <SermonList sermons={latest} loading={loading} />
          </section>
        )}
      </div>
    </div>
  );
}
