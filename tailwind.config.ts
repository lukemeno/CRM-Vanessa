import type { Config } from "tailwindcss";

/**
 * Olive tokens also live in src/app/globals.css (@theme).
 * Layout is desktop-first: unprefixed utilities are the operator canvas.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        olive: {
          DEFAULT: "#5c6540",
          dark: "#3a4128",
        },
        cream: "#faf6ee",
        paper: "#fffdf8",
      },
    },
  },
};

export default config;
