/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pigment: {
          50: '#f0f4ff',
          100: '#dce6ff',
          500: '#1a4fff',
          600: '#0033f5',
          700: '#0028d1',
          900: '#001d85',
        }
      }
    }
  },
  plugins: [],
}

