import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    /**
     * Dev proxy so the frontend can call the API at the SAME relative
     * path it uses in production ("/api/..."), instead of needing an
     * absolute http://localhost:5000 base URL.
     *
     * That absolute base URL was the production outage: Vite inlines
     * import.meta.env at build time, a frontend/.env containing
     * VITE_API_BASE_URL=http://localhost:5000/api was committed, and
     * Vercel built with it - so the deployed bundle asked every
     * visitor's own machine for the API. With this proxy there is no
     * longer any reason for that variable to exist at all.
     */
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_PROXY || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        // Keep the charting library (admin dashboard only) out of the
        // storefront's initial payload.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
        },
      },
    },
  },
});
