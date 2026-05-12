/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        body: ["Aptos", "Segoe UI", "system-ui", "sans-serif"],
        display: ["Iowan Old Style", "Georgia", "serif"],
      },
      colors: {
        ink: {
          950: "#050816",
          900: "#0B1220",
          800: "#111A2E",
        },
        accent: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          500: "#10B981",
          700: "#047857",
        },
        warm: {
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          500: "#F59E0B",
          700: "#B45309",
        },
      },
      boxShadow: {
        glow: "0 20px 60px rgba(16, 185, 129, 0.12)",
      },
    },
  },
  plugins: [],
};
