/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blueprint: {
          base: '#0B1E33',
          panel: '#13365C',
          linework: '#E8F1F8',
          muted: '#7C94AA',
          border: '#1A426F',
          borderBright: '#2B5E94',
          grid: '#0E2742',
          dark: '#071524',
        },
        signal: {
          critical: '#FFB020',
          healthy: '#4ADE80',
          degrading: '#E8893C',
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'scanline': 'scanline 4s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(600%)' },
        }
      }
    },
  },
  plugins: [],
}
