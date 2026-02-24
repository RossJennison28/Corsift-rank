import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react() as unknown as PluginOption],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    fs: {
      // Allow imports from sibling backend folder (Convex generated API types/helpers).
      allow: [path.resolve(__dirname, "..")],
    },
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
})
