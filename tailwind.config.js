/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        surface: {
          50: '#1e212b',
          100: '#161922',
          200: '#11131a',
          300: '#0d0e14',
        },
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
        gonzo: '#ef4444',
        barbaro: '#3b82f6',
        cornish: '#8b5cf6',
        pogue: '#10b981',
        swisher: '#ec4899',
        gross: '#f59e0b',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 1.8s ease-out infinite',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '50%': { transform: 'scale(1.15)', opacity: '0.3' },
          '100%': { transform: 'scale(0.95)', opacity: '0.8' },
        }
      }
    },
  },
  plugins: [],
}
