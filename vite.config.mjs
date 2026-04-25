import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
  preview: {
    port: 4173,
  },
});
