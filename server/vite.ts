import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { Server } from 'http';
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function createViteServer(httpServer: Server): Promise<ViteDevServer> {
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (!isDev) {
    throw new Error('Vite server should only be created in development mode');
  }

  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server: httpServer
    },
    appType: 'spa' as const,
    server: {
      middlewareMode: true,
      hmr: {
        server: httpServer
      }
    }
  };

  const vite = await createServer(serverOptions);
  return vite;
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer(server);

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "client", "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files with caching headers
  app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true
  }));

  // Handle SPA routing - serve index.html for all non-file requests
  app.use("*", (req, res, next) => {
    const filePath = path.resolve(distPath, "index.html");
    if (req.path.includes('.')) {
      next(); // Let express.static handle actual files
      return;
    }
    res.sendFile(filePath);
  });
}
