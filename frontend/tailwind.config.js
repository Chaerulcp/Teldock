/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Single accent: emerald family (locked page-wide)
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        // Warm-neutral ink scale
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae2',
          300: '#b0b9c7',
          400: '#8592a6',
          500: '#66748c',
          600: '#515d73',
          700: '#434c5e',
          800: '#3a4150',
          900: '#0e1116',
          950: '#080a0e',
        },
      },
      boxShadow: {
        'glow': '0 0 0 1px rgba(16,185,129,0.15), 0 8px 40px -8px rgba(16,185,129,0.25)',
        'card': '0 1px 2px rgba(8,10,14,0.04), 0 8px 24px -12px rgba(8,10,14,0.12)',
      },
      backgroundImage: {
        'grid-light': 'linear-gradient(to right, rgba(8,10,14,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(8,10,14,0.04) 1px, transparent 1px)',
        'grid-dark': 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'float': 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
