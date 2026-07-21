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
  plugins: [
    {
      name: "jj-wishlist-share-rewrite",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url || "";
          if (/^\/wishlist\/shared\/[a-z0-9]{8}(?:\/?(?:\?.*)?|$)/i.test(url.split("#")[0])) {
            req.url = "/wishlist-shared.html";
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url || "";
          if (/^\/wishlist\/shared\/[a-z0-9]{8}(?:\/?(?:\?.*)?|$)/i.test(url.split("#")[0])) {
            req.url = "/wishlist-shared.html";
          }
          next();
        });
      },
    },
  ],
});
