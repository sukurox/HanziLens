import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        vellum: "rgb(var(--color-vellum) / <alpha-value>)",
        shelf: "#243b34",
        plum: "#6f3d56",
        gold: "#c7a34a",
        archive: "#2f3f46",
        jade: "#13715b",
        cinnabar: "#b24135",
        mist: "#e8edf1",
      },
      fontFamily: {
        reader: ['"Noto Serif SC"', '"Songti SC"', '"SimSun"', "serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px rgba(24, 32, 28, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
