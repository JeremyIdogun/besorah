import { Link } from 'react-router-dom';
import { useMeta } from '../hooks/useMeta';

export default function NotFound() {
  useMeta({ title: 'Page Not Found' });

  return (
    <div className="min-h-[60vh] bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p
          className="text-7xl font-bold mb-4"
          style={{ color: '#D4A96A', fontFamily: 'Georgia, serif' }}
        >
          404
        </p>
        <h1
          className="text-2xl font-bold mb-3"
          style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
        >
          Page not found
        </h1>
        <p className="text-muted font-ui mb-8 text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-ui font-medium rounded-xl hover:bg-accent transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
