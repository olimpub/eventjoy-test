/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./src/modules/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0F172A',
        'brand-primary': '#0EA5E9',
        'brand-cyan': '#06B6D4',
        'brand-teal': '#14B8A6',
        'brand-yellow': '#FFF76A',
      }
    },
  },
  plugins: [],
  // Engedélyezzük a Tailwind alapértelmezett resetjét (Preflight),
  // hogy a nyers HTML elemek (gombok, inputok) helyesen jelenjenek meg
  corePlugins: {
    preflight: true,
  }
}
