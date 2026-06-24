import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        field: {
          turf: "rgb(var(--color-field-turf) / <alpha-value>)",
          "turf-dark": "rgb(var(--color-field-turf-dark) / <alpha-value>)",
          dark: "rgb(var(--color-field-dark) / <alpha-value>)",
          line: "rgb(var(--color-field-line) / <alpha-value>)",
          cream: "rgb(var(--color-field-cream) / <alpha-value>)",
          gold: "rgb(var(--color-field-gold) / <alpha-value>)",
          sage: "rgb(var(--color-field-sage) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;