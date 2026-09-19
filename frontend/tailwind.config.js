/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        bg: "#FFFFFF",
        ink: "#111111",
        surface: "#F5F5F5",
        border: "#E5E5E5",
        charcoal: "#2A2A28",
        gold: "#C9A961",
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", "serif"],
        body: ["Manrope", "'SF Pro Display'", "sans-serif"],
      },
      borderRadius: {
        none: "0px",
        DEFAULT: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        full: "0px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(17,17,17,0.04), 0 8px 24px rgba(17,17,17,0.04)",
      },
      letterSpacing: {
        luxury: "0.08em",
      },
    },
  },
  plugins: [],
};
