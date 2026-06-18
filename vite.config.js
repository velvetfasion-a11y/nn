import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  css: {
    postcss: false,
  },
  build: {
    cssMinify: false,
  },
  resolve: {
    dedupe: ["firebase", "@firebase/app", "@firebase/auth", "@firebase/firestore"],
  },
  optimizeDeps: {
    include: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/functions"],
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
