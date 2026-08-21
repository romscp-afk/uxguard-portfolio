/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Midnight navy system — Electric Blue brand */
        brand: {
          DEFAULT: "#087CFA",
          50: "#071B3A",
          100: "#0A2852",
          200: "#0D3A7A",
          300: "#29AFFF",
          400: "#08C8F4",
          500: "#087CFA",
          600: "#087CFA",
          700: "#0758E8",
          800: "#0548C4",
          900: "#043A9E",
          950: "#032A75",
        },
        ink: {
          DEFAULT: "#020B24",
          50: "#020B24",
          100: "#041638",
          200: "#082454",
          300: "#27466F",
          400: "#AFC3DD",
          500: "#AFC3DD",
          600: "#C5D4E8",
          700: "#E2EAF5",
          800: "#F0F5FA",
          900: "#FFFFFF",
          950: "#FFFFFF",
        },
        success: {
          DEFAULT: "#21D4B4",
          50: "#0A2F2A",
          100: "#124F46",
          500: "#21D4B4",
          600: "#1AB89C",
          700: "#149A83",
        },
        danger: {
          DEFAULT: "#FF5D73",
          50: "#3A1218",
          100: "#5C1C26",
          500: "#FF5D73",
          600: "#E84B61",
          700: "#C93A4E",
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
