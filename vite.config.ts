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
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'routing': ['wouter'],
          'ui-components': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],
          'data-management': ['@tanstack/react-query'],
          'form-handling': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'media-player': ['react-player'],
          'animations': ['framer-motion']
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },
    target: 'es2020',
    assetsDir: "assets",
    sourcemap: true,
    manifest: true,
    minify: 'esbuild',
    cssMinify: true,
    cssCodeSplit: true
  },
  optimizeDeps: {
    include: ['react-player'],
    esbuildOptions: {
      target: 'es2020',
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
  }
});
