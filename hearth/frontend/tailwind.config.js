/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hearth: {
          50: '#FDF8F0',
          100: '#FAEFD9',
          200: '#F5DDB3',
          300: '#EFC88A',
          400: '#E8AE5C',
          500: '#D4913A',
          600: '#B5742B',
          700: '#8A5820',
          800: '#5F3D16',
          900: '#3A250D',
        },
        warmgray: {
          50: '#FAFAF8',
          100: '#F5F4F0',
          200: '#ECEAE3',
          300: '#D8D4CA',
          400: '#B8B3A6',
          500: '#918B7C',
          600: '#6E6A5E',
          700: '#504D44',
          800: '#35332D',
          900: '#1D1C18',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'elevated': '0 10px 25px rgba(0,0,0,0.07), 0 4px 10px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};
