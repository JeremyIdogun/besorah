import { useCallback, useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getPublishedPosts } from '../../lib/queries';
import PostCard from '../../components/public/PostCard';
import { useMeta } from '../../hooks/useMeta';

const PAGE_SIZE = 12;

export default function Blog() {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useMeta({
    title: 'Blog',
    description: 'Original written teaching and devotional articles, plus short clips from Besorah.',
    url: `${window.location.origin}${pathname}`,
  });

  const fetchPosts = useCallback(() => {
    setLoading(true);
    setError(null);
    getPublishedPosts({ page, pageSize: PAGE_SIZE })
      .then(({ posts: results, total: count }) => {
        setPosts(results);
        setTotal(count);
      })
      .catch(() => setError('Some content could not load. Please try again.'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function goToPage(p) {
    setSearchParams({ page: String(p) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <div
        className="text-center px-6 sm:px-16"
        style={{
          background: 'linear-gradient(140deg, #2A1004 0%, #4E1C08 55%, #3A1806 100%)',
          paddingTop: 64,
          paddingBottom: 64,
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h1
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: '#FBF0E0', fontFamily: 'Georgia, serif' }}
          >
            Blog
          </h1>
          <p
            className="font-ui mx-auto"
            style={{ fontSize: 15, color: '#C8B090', maxWidth: 460, lineHeight: 1.65 }}
          >
            Written teaching and devotional articles, plus short clips — for reading and
            reflecting between sermons.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-16 py-14">
        {error && (
          <div className="mb-12 rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-800 font-ui mb-3">{error}</p>
            <button
              onClick={fetchPosts}
              className="inline-flex items-center gap-2 text-sm font-ui font-medium text-red-700 hover:text-red-900 transition-colors"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-[14px] h-72 animate-pulse" />
            ))}
          </div>
        ) : !posts.length ? (
          <div className="text-center py-16 font-ui" style={{ color: '#8A6A4A' }}>
            No posts yet. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-ui transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary"
              style={{ border: '1px solid rgba(180,130,70,0.14)', color: '#9A7A5A' }}
            >
              <ChevronLeft size={15} />
              Prev
            </button>
            <span className="text-sm font-ui px-2" style={{ color: '#9A7A5A' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-ui transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary"
              style={{ border: '1px solid rgba(180,130,70,0.14)', color: '#9A7A5A' }}
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
