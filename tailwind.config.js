/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4A90E2',
        secondary: '#7B68EE',
        accent: '#FF6B6B',
        success: '#51CF66',
        warning: '#FFD93D',
      },
    },
  },
  plugins: [],
}

