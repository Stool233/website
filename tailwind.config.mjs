import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        neucha: ["Neucha", "cursive"],
        mono: ["JetBrains Mono", "Fira Code", ...defaultTheme.fontFamily.mono],
      },
      colors: {
        // Notion-inspired warm neutral palette
        accent: {
          DEFAULT: "#2383e2", // Notion blue
          light: "#529cca",   // softer for dark mode
          dark: "#2383e2",    // same for light mode
          subtle: "#f1f5f9",  // very light blue-gray bg
        },
        surface: {
          DEFAULT: "#ffffff",
          secondary: "#f7f6f3",    // Notion warm off-white
          tertiary: "#f1f1ef",     // Notion hover bg
          dark: "#191919",         // Notion dark bg
          "dark-secondary": "#202020",
          "dark-tertiary": "#2f2f2f",
        },
        ink: {
          DEFAULT: "#37352f",      // Notion warm black
          secondary: "#787774",    // Notion secondary text
          tertiary: "#9b9a97",     // Notion tertiary text
          dark: "#e3e3e0",         // Notion dark mode text
          "dark-secondary": "#9b9a97",
          "dark-tertiary": "#6b6b6b",
        },
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
