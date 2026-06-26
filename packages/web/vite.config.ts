import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  root: ".",
  // Injeta IS_DEV_MODE como literal no bundle — Rollup elimina código morto em produção
  define: {
    __IS_DEV_MODE__: JSON.stringify(mode === "development"),
  },
  publicDir: "../../public",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 4200,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/favicon.ico": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/logo.svg": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["wouter"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
}));
