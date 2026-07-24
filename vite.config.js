import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  appType: "mpa",
  server: {
    proxy: {
      "/waydoo": {
        target: "http://127.0.0.1:3456",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    target: "es2020",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("chart.js")) return "charts";
          if (id.includes("grapesjs") || id.includes("grapes-flyer")) return "grapes";
        },
      },
      input: {
        main: resolve(__dirname, "index.html"),
        pricing: resolve(__dirname, "pricing.html"),
        flightLessons: resolve(__dirname, "flight-lessons.html"),
        reservationRequest: resolve(__dirname, "reservation-request.html"),
        corporate: resolve(__dirname, "corporate.html"),
        about: resolve(__dirname, "about.html"),
        contact: resolve(__dirname, "contact.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});
