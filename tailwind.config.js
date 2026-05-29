/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#08090c",
        surface: "#0f1117",
        neonCyan: "#00f0ff",
        neonFuchsia: "#ff007f",
        neonGold: "#d4af37",
      },
      fontFamily: {
        display: ["Montserrat", "sans-serif"],
        body: ["Plus Jakarta Sans", "sans-serif"],
      },
      boxShadow: {
        neonCyan: "0 0 15px rgba(0, 240, 255, 0.4)",
        neonFuchsia: "0 0 15px rgba(255, 0, 127, 0.4)",
        neonGold: "0 0 15px rgba(212, 175, 55, 0.4)",
        glow: "0 0 25px rgba(0, 240, 255, 0.15)",
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
