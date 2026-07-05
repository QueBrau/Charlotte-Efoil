import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2020",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("chart.js")) return "charts";
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
