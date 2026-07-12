import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  envPrefix: ["VITE_", "ADMIN_"],
  css: {
    postcss: false,
  },
  build: {
    cssMinify: false,
  },
  server: {
    hmr: {
      overlay: true,
    },
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
