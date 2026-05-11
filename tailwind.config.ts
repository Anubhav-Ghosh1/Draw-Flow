import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2328",
        canvas: "#fafaf7",
        accent: "#6366f1",
      },
      fontFamily: {
        hand: ['"Caveat"', '"Comic Sans MS"', "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
