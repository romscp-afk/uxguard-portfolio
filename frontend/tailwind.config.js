/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* Logo teal: #0eb5bd · Logo navy: #001334 */
        brand: {
          50: "#eefcfd",
          100: "#d5f7f8",
          200: "#aeeef0",
          300: "#76dfe3",
          400: "#3eced4",
          500: "#0eb5bd",
          600: "#0c9aa1",
          700: "#0a7d83",
          800: "#086468",
          900: "#065356",
          950: "#033638",
        },
        ink: {
          50: "#f4f7fb",
          100: "#e8eef6",
          200: "#d1dbe8",
          300: "#a8b9cf",
          400: "#7a92ad",
          500: "#5a7390",
          600: "#475c74",
          700: "#3a4a5f",
          800: "#2a3850",
          900: "#162440",
          950: "#001334",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
