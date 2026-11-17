import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ChevronRight, Calendar, Clock, ExternalLink, Share2, Check } from 'lucide-react';
import { getPostBySlug, getRelatedPosts } from '../../lib/queries';
import { renderMarkdown, estimateReadTime } from '../../lib/markdown';
import PostCard from '../../components/public/PostCard';
import { useMeta } from '../../hooks/useMeta';

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Defence in depth for rows saved before the server derived embed URLs itself.
function isTrustedEmbedUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (url.hostname === 'www.youtube.com') return url.pathname.startsWith('/embed/');
    if (url.hostname === 'www.instagram.com') return url.pathname.endsWith('/embed');
    return false;
  } catch {
    return false;
  }
}

const PROSE_CLASSES = [
  '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:leading-snug',
  '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:leading-snug',
  '[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2',
  '[&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif',
  '[&_p]:mb-4 [&_p]:leading-relaxed',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1',
  '[&_a]:underline [&_a]:underline-offset-2',
  '[&_strong]:font-semibold',
  '[&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:mb-4',
  '[&_code]:font-mono [&_code]:text-xs [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded',
  '[&_img]:rounded-[14px] [&_img]:my-4',
  '[&_hr]:my-8',
].join(' ');

export default function BlogPost() {
  const { slug } = useParams();
  const { pathname } = useLocation();
  // Results are stored with the slug/post they belong to, so a slow response
  // for a previous slug can never be shown under the current URL.
  const [postState, setPostState] = useState({ slug: null, post: null, error: null });
  const [relatedState, setRelatedState] = useState({ postId: null, posts: [] });
  const [copied, setCopied] = useState(false);

  const loading = postState.slug !== slug;
  const post = loading ? null : postState.post;
  const error = loading ? null : postState.error;
  const postId = post?.id ?? null;
  const pillarId = post?.pillar_id ?? null;
  const relatedLoading = Boolean(pillarId) && relatedState.postId !== postId;
  const related = relatedState.postId === postId ? relatedState.posts : [];

  useMeta({
    title: post?.title,
    description: post?.excerpt?.slice(0, 160) || undefined,
    image: post?.cover_image_url || undefined,
    url: `${window.location.origin}${pathname}`,
  });

  useEffect(() => {
    let cancelled = false;
    getPostBySlug(slug)
      .then((p) => {
        if (!cancelled) setPostState({ slug, post: p, error: null });
      })
      .catch((err) => {
        if (!cancelled) setPostState({ slug, post: null, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!postId || !pillarId) return undefined;
    let cancelled = false;
    getRelatedPosts(postId, pillarId, 3)
      .then((posts) => {
        if (!cancelled) setRelatedState({ postId, posts });
      })
      .catch(() => {
        if (!cancelled) setRelatedState({ postId, posts: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [postId, pillarId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-16 py-12 space-y-4">
        <div className="h-8 w-64 bg-surface rounded-lg animate-pulse" />
        <div className="h-48 bg-surface rounded-[14px] animate-pulse" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-16 py-16 text-center">
        <p className="font-ui mb-4" style={{ color: '#8A6A4A' }}>Post not found.</p>
        <Link to="/blog" className="text-accent text-sm font-ui hover:text-primary">← Back to Blog</Link>
      </div>
    );
  }

  const isClip = post.content_type === 'clip';
  const pillar = post.pillars;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-16 py-10">
        <nav className="flex items-center gap-1 text-sm font-ui mb-8 flex-wrap" style={{ color: '#9A7A5A' }}>
          <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
          {pillar && (
            <>
              <ChevronRight size={13} className="flex-shrink-0" />
              <Link to={`/blog?pillar=${encodeURIComponent(pillar.slug)}`} className="hover:text-primary transition-colors">
                {pillar.name}
              </Link>
            </>
          )}
          <ChevronRight size={13} className="flex-shrink-0" />
          <span className="line-clamp-1" style={{ color: '#1A0E06' }}>{post.title}</span>
        </nav>

        <div
          className="overflow-hidden"
          style={{
            backgroundColor: '#FBF4E8',
            border: '1px solid rgba(180, 130, 70, 0.14)',
            borderRadius: 14,
            boxShadow: '0 2px 12px rgba(58, 24, 6, 0.06)',
          }}
        >
          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-56 object-cover"
            />
          )}

          <div className="p-8">
            <div className="flex items-center gap-3 mb-4 text-xs font-ui" style={{ color: '#9A7A5A' }}>
              {isClip ? (
                <span
                  className="inline-block px-3 py-1 rounded-full uppercase tracking-wide font-medium"
                  style={{ backgroundColor: 'rgba(193,123,63,0.14)', color: '#C17B3F' }}
                >
                  {post.platform}
                </span>
              ) : (
                <>
                  {post.published_at && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={13} />
                      {formatDate(post.published_at)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={13} />
                    {post.read_time_minutes ?? estimateReadTime(post.body)} min read
                  </span>
                </>
              )}
            </div>

            <h1
              className="text-2xl md:text-3xl font-bold mb-5 leading-snug"
              style={{ color: '#1A0E06', fontFamily: 'Georgia, serif' }}
            >
              {post.title}
            </h1>

            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-ui font-medium px-3 py-1 rounded-full"
                    style={{ border: '1px solid rgba(180,130,70,0.2)', color: '#9A7A5A' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {isClip ? (
              <>
                {post.excerpt && (
                  <p className="text-sm font-ui leading-relaxed mb-6" style={{ color: '#8A6A4A' }}>
                    {post.excerpt}
                  </p>
                )}

                {post.external_url && (
                  <div className="mb-6">
                    <a
                      href={post.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 text-white font-ui font-medium rounded-full hover:bg-accent transition-colors"
                      style={{ backgroundColor: '#2A1004' }}
                    >
                      <span>Watch original</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}

                {isTrustedEmbedUrl(post.embed_url) && (
                  <div className="rounded-[14px] overflow-hidden" style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                    <iframe
                      src={post.embed_url}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      title={post.title}
                      allowFullScreen
                    />
                  </div>
                )}
              </>
            ) : (
              post.body && (
                <div
                  className={PROSE_CLASSES}
                  style={{ color: '#8A6A4A' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
                />
              )
            )}

            <div className="flex flex-wrap items-center gap-3 mt-8 pt-6" style={{ borderTop: '1px solid rgba(180,130,70,0.14)' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-ui font-medium rounded-full hover:text-primary transition-colors"
                style={{ border: '1px solid rgba(180,130,70,0.14)', color: '#9A7A5A' }}
              >
                {copied ? <Check size={14} /> : <Share2 size={14} />}
                {copied ? 'Link copied!' : 'Share'}
              </button>
            </div>
          </div>
        </div>

        {(relatedLoading || related.length > 0) && pillar && (
          <section className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-bold"
                style={{ color: '#2A1004', fontFamily: 'Georgia, serif' }}
              >
                More in {pillar.name}
              </h2>
              <Link
                to={`/blog?pillar=${encodeURIComponent(pillar.slug)}`}
                className="text-sm font-ui text-accent hover:text-primary transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-surface rounded-[14px] h-72 animate-pulse" />
                  ))
                : related.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
