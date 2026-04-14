/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Syne", "Outfit", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          teal: "#0d9488",
          deep: "#0f766e",
          ink: "#0c4a6e",
          coral: "#fb7185",
          amber: "#fbbf24",
        },
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(13, 148, 136, 0.45)",
        "glow-sm": "0 4px 24px -4px rgba(13, 148, 136, 0.35)",
        card: "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 12px 24px -8px rgb(15 118 110 / 0.12)",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "gradient-shift": "gradient-shift 8s ease infinite",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
