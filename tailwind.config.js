/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        galileo: {
          blue: '#2F5496',
          light: '#EBF0F9',
        },
      },
    },
  },
  plugins: [],
}
