import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  css: {
    postcss: false,
  },
  server: {
    hmr: {
      overlay: true,
    },
  },
});
