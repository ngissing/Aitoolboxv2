import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-player': ['react-player'],
        },
      },
    },
    assetsDir: "assets",
    sourcemap: true
  },
  optimizeDeps: {
    include: ['react-player'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    fs: {
      strict: false,
      allow: ['..']
    },
    hmr: {
      overlay: false,
      port: 3000
    },
    proxy: {
      '/api': {
        target: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5001',
        changeOrigin: true,
        secure: true,
        ws: true
      }
    }
  },
});
