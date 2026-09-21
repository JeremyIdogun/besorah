import { Link } from 'react-router-dom';
import { Video, Camera } from 'lucide-react';
import { estimateReadTime } from '../../lib/markdown';

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const PLATFORM_ICON = { youtube: Video, instagram: Camera };

export default function PostCard({ post }) {
  const { slug, title, excerpt, cover_image_url, content_type, published_at, tags = [], platform } = post;
  const isClip = content_type === 'clip';
  const PlatformIcon = PLATFORM_ICON[platform] || Video;

  return (
    <div
      className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(58,24,6,0.09)]"
      style={{
        backgroundColor: '#FBF4E8',
        border: '1px solid rgba(180, 130, 70, 0.14)',
        borderRadius: 14,
        boxShadow: '0 2px 12px rgba(58, 24, 6, 0.06)',
      }}
    >
      {cover_image_url ? (
        <img
          src={cover_image_url}
          alt={title}
          className="w-full object-cover"
          style={{ height: 156 }}
        />
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            height: 156,
            background: 'repeating-linear-gradient(135deg, #E8D8C0 0px, #E8D8C0 14px, #DFCDB4 14px, #DFCDB4 28px)',
          }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#A08060' }}>
            {isClip ? 'clip' : 'article'}
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          {isClip ? (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-ui font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide"
              style={{ backgroundColor: 'rgba(193,123,63,0.14)', color: '#C17B3F' }}
            >
              <PlatformIcon size={11} />
              {platform}
            </span>
          ) : (
            <span className="font-ui text-[11px]" style={{ color: '#9A7A5A' }}>
              {[formatDate(published_at), `${estimateReadTime(post.body)} min read`].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>

        <Link to={`/blog/${slug}`}>
          <h3
            className="font-bold leading-snug mb-2 line-clamp-2 hover:opacity-80 transition-opacity"
            style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1A0E06' }}
          >
            {title}
          </h3>
        </Link>

        {excerpt && (
          <p className="font-ui text-xs leading-relaxed mb-3 line-clamp-1" style={{ color: '#8A6A4A' }}>
            {excerpt}
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-ui font-medium px-2 py-0.5 rounded-full"
                style={{ border: '1px solid rgba(180,130,70,0.2)', color: '#9A7A5A' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
