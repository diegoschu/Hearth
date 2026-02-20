/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hearth: {
          cream: '#FDFBF7',
          dark: '#2D2A26',
          warm: '#D4804A',
          'warm-light': '#E8A66A',
          muted: '#9B9590',
          border: '#F0ECE6',
          'border-dark': '#E8E4DF',
          surface: '#FAF8F5',
          'surface-dark': '#F5F2ED',
        },
        dad: { DEFAULT: '#4A90D9', bg: '#E0ECFF', text: '#3A6BC5' },
        mom: { DEFAULT: '#D94A6B', bg: '#FEE8E8', text: '#D94A6B' },
        school: '#4A90D9',
        medical: '#D94A6B',
        extracurricular: '#6DBE4A',
        social: '#E8913A',
        household: '#9B6DBE',
        success: { DEFAULT: '#4A8C2A', bg: '#E8F5E0' },
        warning: { DEFAULT: '#E8913A', bg: '#FFF3E0' },
        danger: { DEFAULT: '#D94A4A', bg: '#FFEBEE' },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
    },
  },
  plugins: [],
};
