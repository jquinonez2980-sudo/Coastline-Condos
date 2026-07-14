/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './open.html',
    './js/**/*.js',
    './css/styles.css',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#f2f8f7',
          100: '#dfeeed',
          200: '#bedddb',
          300: '#93c7c4',
          400: '#6fb3b0',
          500: '#4a9797',
          600: '#3c8585',
          700: '#357878',
          800: '#2f6b6b',
          900: '#2A6868',
          950: '#1E4E4E',
        },
        sand: {
          50: '#FBF6EC',
          100: '#f6eedd',
          200: '#ede0c6',
          300: '#e2d0ac',
          400: '#d4ba8a',
          500: '#c4a46e',
          600: '#b08d5a',
        },
        champagne: {
          DEFAULT: '#C9714F',
          light: '#E39A7B',
          dark: '#A85A3B',
        },
        gold: '#A8792F',
        palm: {
          DEFAULT: '#3E7A5C',
          light: '#8FC49A',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Montserrat', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.8s ease-out forwards',
        float: 'float 6s ease-in-out infinite',
        wave: 'wave 8s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        wave: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(-20px)' },
        },
      },
    },
  },
  plugins: [],
  // Keep utilities that styles.css also defines so cascade is predictable;
  // Tailwind base is disabled — we ship our own reset in styles.css.
  corePlugins: {
    preflight: false,
  },
};
