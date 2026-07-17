/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d1d1f",
        muted: "#6e6e73",
        hairline: "#d2d2d7",
        surface: "#f5f5f7",
        accent: "#0071e3",
        "accent-dark": "#0058b0",
        good: "#1e8e3e",
        warn: "#d97706",
        bad: "#d93025",
      },
      fontFamily: {
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        text: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 2px 20px rgba(0,0,0,0.06)",
        pop: "0 8px 30px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
