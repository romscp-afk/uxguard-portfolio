/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Electric Blue brand on the original light ink system */
        brand: {
          DEFAULT: "#087CFA",
          50: "#EBF5FF",
          100: "#D6EBFF",
          200: "#ADD6FF",
          300: "#29AFFF",
          400: "#08C8F4",
          500: "#087CFA",
          600: "#0758E8",
          700: "#0548C4",
          800: "#043A9E",
          900: "#032A75",
          950: "#021B4D",
        },
        ink: {
          DEFAULT: "#001334",
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
      backgroundImage: {
        "primary-gradient":
          "linear-gradient(135deg, #08C8F4 0%, #087CFA 48%, #0758E8 100%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
