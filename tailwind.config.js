/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#EAE0D0',
        surface: '#FBF4E8',
        'nav-bg': '#3A1806',
        'hero-bg': '#2A1004',
        primary: '#2A1004',
        accent: '#C17B3F',
        gold: '#D4A017',
        'text-main': '#1A0E06',
        'muted-dark': '#9A7A5A',
        'muted-light': '#8A6A4A',
      },
      fontFamily: {
        sans: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        ui: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 8px rgba(58, 24, 6, 0.04)',
        card: '0 2px 12px rgba(58, 24, 6, 0.06)',
      },
    },
  },
  plugins: [],
};
