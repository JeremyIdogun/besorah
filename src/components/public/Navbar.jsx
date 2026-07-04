import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50" style={{ backgroundColor: '#3A1806', height: 72 }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-16 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img
            src="/branding/besorah_primary_logo.svg"
            alt="Besorah"
            className="w-auto"
            style={{ height: 38 }}
          />
        </Link>

        <div className="flex items-center gap-8">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `text-sm font-ui transition-colors duration-150 ${
                isActive
                  ? 'font-semibold border-b-2 pb-0.5'
                  : 'hover:text-[#FBF0E0]'
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? '#FBF0E0' : '#9A7A5A',
              borderColor: isActive ? '#D4A017' : 'transparent',
            })}
          >
            Home
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `text-sm font-ui transition-colors duration-150 ${
                isActive
                  ? 'font-semibold border-b-2 pb-0.5'
                  : 'hover:text-[#FBF0E0]'
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? '#FBF0E0' : '#9A7A5A',
              borderColor: isActive ? '#D4A017' : 'transparent',
            })}
          >
            Search
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `text-sm font-ui transition-colors duration-150 ${
                isActive
                  ? 'font-semibold border-b-2 pb-0.5'
                  : 'hover:text-[#FBF0E0]'
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? '#FBF0E0' : '#9A7A5A',
              borderColor: isActive ? '#D4A017' : 'transparent',
            })}
          >
            About
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
