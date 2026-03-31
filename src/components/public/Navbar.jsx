import { Link, NavLink } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-card-bg border-b border-amber-100 shadow-soft sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">✝</span>
          <span
            className="text-xl font-bold tracking-wide"
            style={{ color: '#8B4513', fontFamily: 'Georgia, serif' }}
          >
            Besorah
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm font-ui transition-colors ${
                isActive ? 'text-primary font-semibold' : 'text-muted hover:text-primary'
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `flex items-center gap-1 text-sm font-ui transition-colors ${
                isActive ? 'text-primary font-semibold' : 'text-muted hover:text-primary'
              }`
            }
          >
            <Search size={14} />
            Search
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
