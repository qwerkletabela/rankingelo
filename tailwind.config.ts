import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",  // Rummikub red
          800: "#991b1b",
          900: "#7f1d1d",
        },
      },
      boxShadow: {
        soft: "0 6px 30px rgba(0,0,0,0.10)",
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
