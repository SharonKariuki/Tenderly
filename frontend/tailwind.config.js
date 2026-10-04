/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plum: '#5B1A33',
        'plum-deep': '#5B1A33',
        'plum-ink': '#2B1B22',
        'plum-soft': '#7A6670',
        'plum-muted': '#7A6670',
        coral: '#E5484D',
        'coral-wine': '#5B1A33',
        lilac: '#7FA58F',
        'lilac-light': '#FBE4E6',
        blush: '#FBE4E6',
        line: '#FBE4E6',
        'ok-bg': '#FBE4E6',
        'ok-text': '#2B1B22',
        'ok-solid': '#2F8F6B',
        'warn-bg': '#FBE4E6',
        'warn-text': '#2B1B22',
        'warn-solid': '#E3A12F',
        white: '#FFFAF9',
        black: '#2B1B22',
        gray: {
          50: '#FFFAF9',
          100: '#FBE4E6',
          200: '#FBE4E6',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      fontSize: {
        'h1': ['56px', { lineHeight: '1.2', letterSpacing: '-0.04em', fontWeight: '400' }],
        'h2': ['22px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '500' }],
        'big': ['64px', { lineHeight: '1.2', letterSpacing: '-0.05em', fontWeight: '300' }],
        'hero': ['34px', { lineHeight: '1.2', letterSpacing: '-0.035em', fontWeight: '500' }],
        'body': ['15px', { fontWeight: '400' }],
        'intro': ['17px', { fontWeight: '400' }],
      },
      borderRadius: {
        'card': '30px',
        'hero-card': '32px',
        'tile': '18px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(91,26,51,.04), 0 12px 32px rgba(91,26,51,.06)',
        'hero': '0 20px 40px rgba(91,26,51,.25)',
      },
      keyframes: {
        fadeup: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulsering: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        sheen: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        burst: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        flow: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        orbit: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
        },
      },
      animation: {
        fadeup: 'fadeup 0.5s ease-out forwards',
        pop: 'pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        pulsering: 'pulsering 2s infinite',
        sheen: 'sheen 2s infinite',
        scan: 'scan 2s infinite',
        burst: 'burst 0.6s ease-out',
        floaty: 'floaty 3s ease-in-out infinite',
        flow: 'flow 4s linear infinite',
        orbit: 'orbit 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
