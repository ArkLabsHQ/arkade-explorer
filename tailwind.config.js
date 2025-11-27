/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'arkade-black': 'rgb(var(--color-arkade-black) / <alpha-value>)',
        'arkade-purple': 'rgb(var(--color-arkade-purple) / <alpha-value>)',
        'arkade-orange': 'var(--color-arkade-orange)',
        'arkade-gray': 'rgb(var(--color-arkade-gray) / <alpha-value>)',
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'spin-reverse': 'spin-reverse 1s linear infinite',
      },
      keyframes: {
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
      },
    },
  },
  plugins: [],
}
