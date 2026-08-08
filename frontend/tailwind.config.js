/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            light: '#e7f6fe',
            soft: '#a6e0f9',
            DEFAULT: '#078ECE',
            dark: '#06749f',
            deep: '#055070',
            ink: '#022f42',
          },
          blue: {
            light: '#eff6ff',
            soft: '#dbeafe',
            DEFAULT: '#3b82f6',
            dark: '#1d4ed8',
            deep: '#1e3a8a',
          },
          gold: {
            light: '#faf3d9',
            soft: '#f2de99',
            DEFAULT: '#e4bc33',
            dark: '#b69629',
          },
          cream: '#f8fafc',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.03), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        card: '0 1px 2px 0 rgb(0 0 0 / 0.03), 0 4px 12px -2px rgb(2 6 23 / 0.06)',
        lift: '0 10px 24px -8px rgb(2 6 23 / 0.18)',
      },
    },
  },
  plugins: [],
};
