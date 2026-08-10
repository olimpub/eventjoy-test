/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#303A52',
        'brand-yellow': '#FFF76A',
        'brand-cyan': '#00B1E9',
        'brand-green': '#0B2A1B',
      },
    },
  },
  plugins: [],
}
