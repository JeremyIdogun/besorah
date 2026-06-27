import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar({ initialValue = '', onSearch, placeholder = 'Search by title, preacher or church…', variant = 'light' }) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    if (onSearch) {
      onSearch(value.trim());
    } else {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  }

  const isDark = variant === 'dark';

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center w-full max-w-[520px] mx-auto"
      style={{
        background: isDark ? 'rgba(255,255,255,0.07)' : '#FBF4E8',
        border: isDark ? '1px solid rgba(212,160,23,0.30)' : '1px solid rgba(180,130,70,0.14)',
        borderRadius: 100,
        padding: '10px 10px 10px 24px',
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 bg-transparent border-none outline-none text-[15px] font-ui ${isDark ? 'search-input-dark' : 'search-input-light'}`}
        style={{ color: isDark ? '#C8B090' : '#1A0E06' }}
      />
      <button
        type="submit"
        className="font-ui font-semibold text-sm whitespace-nowrap transition-colors duration-150"
        style={{
          background: '#D4A017',
          color: '#1A0E06',
          borderRadius: 100,
          padding: '11px 28px',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#C4920E'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#D4A017'}
      >
        Search
      </button>
    </form>
  );
}
