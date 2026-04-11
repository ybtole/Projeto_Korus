/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eef4fb',
          100: '#cde0f4',
          200: '#9dc2e9',
          500: '#2a6099',
          700: '#1a3a5c',
          900: '#0d1e30',
        },
        accent: '#e8a020',
      },
      opacity: {
        8: '0.08',
      },
    },
  },
  plugins: [],
}
