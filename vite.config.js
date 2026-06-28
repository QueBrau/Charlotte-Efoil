import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        pricing: resolve(__dirname, "pricing.html"),
        reservationDetails: resolve(__dirname, "reservation-details.html"),
        flightLessons: resolve(__dirname, "flight-lessons.html"),
        reservationRequest: resolve(__dirname, "reservation-request.html"),
        more: resolve(__dirname, "more.html"),
        corporate: resolve(__dirname, "corporate.html"),
        about: resolve(__dirname, "about.html"),
        contact: resolve(__dirname, "contact.html"),
      },
    },
  },
});
