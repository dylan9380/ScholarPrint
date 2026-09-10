/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#16273D",
        inksoft: "#22364E",
        cyan: "#3E7CA6",
        cyanbright: "#5B9AC4",
        kraft: "#C08A46",
        kraftsoft: "#E4C994",
        paper: "#EFEDE3",
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
