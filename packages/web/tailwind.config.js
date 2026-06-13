/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0F9D8A",
          50: "#E6F7F5",
          100: "#CCEDE9",
          500: "#0F9D8A",
          600: "#0D8A79",
          700: "#0B7868",
        },
      },
    },
  },
  plugins: [],
};
