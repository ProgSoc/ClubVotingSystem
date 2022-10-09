/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      textColor: {},
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    darkTheme: 'dracula',
    lightTheme: 'dracula',
  },
};
