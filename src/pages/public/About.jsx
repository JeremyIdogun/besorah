import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useMeta } from '../../hooks/useMeta';

export default function About() {
  const { pathname } = useLocation();
  useMeta({
    title: 'About Besorah',
    description: 'Learn about Besorah — a platform for discovering Christian sermons organised by theme.',
    url: `${window.location.origin}${pathname}`,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-14">
        <nav className="flex items-center gap-1 text-sm font-ui text-muted mb-8">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight size={13} className="flex-shrink-0" />
          <span className="text-text-main">About</span>
        </nav>

        <h1
          className="text-3xl font-bold mb-6"
          style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
        >
          About Besorah
        </h1>

        <div className="space-y-5 text-sm text-muted font-ui leading-relaxed">
          <p>
            <strong className="text-text-main">Besorah</strong> (בְּשׂוֹרָה) is the Hebrew word
            for "good news." This platform exists to help people discover Christian sermons
            organised by theme — making it easier to find preaching that speaks to where you are
            in your faith journey.
          </p>

          <h2
            className="text-xl font-bold pt-4"
            style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
          >
            What are Pillars?
          </h2>
          <p>
            Pillars are the core themes we use to organise sermons. Each pillar represents a
            foundational topic of the Christian faith — from Salvation and Prayer to Identity
            and Mission. When you browse a pillar, you'll find sermons from different preachers
            and churches, all speaking to that theme.
          </p>

          <h2
            className="text-xl font-bold pt-4"
            style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
          >
            How it works
          </h2>
          <p>
            We curate sermons from YouTube and Spotify, review each one for quality and
            relevance, and tag them to the appropriate pillars. Every sermon you see on Besorah
            has been reviewed and approved before it appears on the site.
          </p>
          <p>
            Besorah simply points you to sermons hosted on their original platforms — YouTube
            and Spotify. We do not host, own, or claim any rights over the sermon content.
            All sermons remain the property of their respective creators and churches.
          </p>

          <h2
            className="text-xl font-bold pt-4"
            style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
          >
            Getting started
          </h2>
          <p>
            If you're new to the faith or exploring Christianity, we recommend starting with
            the{' '}
            <Link to="/pillar/salvation" className="text-accent hover:text-primary transition-colors underline">
              Salvation
            </Link>{' '}
            pillar. Otherwise, browse our themes on the homepage or use the search to find
            sermons by title, preacher, or church.
          </p>
        </div>

        <div className="mt-10 pt-8 border-t border-amber-100 flex flex-wrap gap-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-white text-sm font-ui font-medium rounded-full hover:bg-accent transition-colors"
          >
            Browse Themes
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-amber-200 text-sm font-ui font-medium text-muted rounded-full hover:text-primary hover:border-primary transition-colors"
          >
            Search Sermons
          </Link>
        </div>
      </div>
    </div>
  );
}
