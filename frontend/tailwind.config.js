/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plum: '#3D1F47',
        'plum-deep': '#24112B',
        'plum-ink': '#2A1530',
        'plum-soft': '#5A3F64',
        'plum-muted': '#6E5478',
        coral: '#E8505B',
        'coral-wine': '#8E2238',
        lilac: '#C8B6E2',
        'lilac-light': '#EDE4F4',
        blush: '#F9D5DC',
        line: '#E4D6E2',
        'ok-bg': '#D9F0EC',
        'ok-text': '#1E6F65',
        'ok-solid': '#2A9D8F',
        'warn-bg': '#FBEBCF',
        'warn-text': '#8A5A12',
        'warn-solid': '#E9A23B',
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
        'card': '0 1px 2px rgba(61,31,71,.04), 0 12px 32px rgba(61,31,71,.06)',
        'hero': '0 20px 40px rgba(61,31,71,.25)',
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
