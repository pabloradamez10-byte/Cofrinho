/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Manrope", "sans-serif"],
      },
      colors: {
        bg: "#FBFAF5",
        surface: "#FFFFFF",
        ink: "#16241D",
        "ink-soft": "#5C6B62",
        line: "#E8E2D4",
        primary: "#0E7A53",
        "primary-dk": "#0B5C3F",
        "primary-lt": "#E3F3EA",
        accent: "#FF6B45",
        "accent-lt": "#FFE7DD",
        gold: "#E0A23B",
        "gold-lt": "#FBEEDA",
      },
    },
  },
  plugins: [],
};
