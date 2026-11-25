/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#121212",
        inksoft: "#2D2D2D",
        cyan: "#FF4D00",
        cyanbright: "#FF4D00",
        kraft: "#FF4D00",
        kraftsoft: "#F7A384",
        paper: "#F7F6F2",
        proofred: "#B8412C",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        serif: ["var(--font-serif)"],
      },
    },
  },
  plugins: [],
};
