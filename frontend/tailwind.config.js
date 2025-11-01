/** @type {import('tailwindcss').Config} */
export default {
  // This tells Tailwind to look inside all your HTML and React files in the src folder
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}