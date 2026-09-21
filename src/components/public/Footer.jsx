import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#2A1004', marginTop: 52, padding: '36px 64px' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-5">
          <div>
            <Link to="/" className="inline-block mb-2">
              <img
                src="/branding/besorah_primary_logo.svg"
                alt="Besorah"
                className="w-auto"
                style={{ height: 26 }}
              />
            </Link>
            <p className="text-xs font-ui" style={{ color: '#9A7A5A' }}>
              Good News, Organised by Theme.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-7 gap-y-2 text-sm font-ui">
            <Link to="/" className="transition-colors duration-150 hover:text-[#FBF0E0]" style={{ color: '#9A7A5A' }}>Home</Link>
            <Link to="/search" className="transition-colors duration-150 hover:text-[#FBF0E0]" style={{ color: '#9A7A5A' }}>Search</Link>
            <Link to="/blog" className="transition-colors duration-150 hover:text-[#FBF0E0]" style={{ color: '#9A7A5A' }}>Blog</Link>
            <Link to="/about" className="transition-colors duration-150 hover:text-[#FBF0E0]" style={{ color: '#9A7A5A' }}>About</Link>
          </nav>
        </div>

        <div className="pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-ui" style={{ color: '#6A4A2A' }}>
            &copy; {new Date().getFullYear()} Besorah. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
