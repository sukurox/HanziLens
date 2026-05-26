import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18201c",
        paper: "#f7f8f6",
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
