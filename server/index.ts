import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase, closeDatabase } from "./db";

const app = express();
// Increase body size limit for video uploads (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Enable CORS
app.use((req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const vercelUrl = process.env.VERCEL_URL;
  const origin = req.headers.origin || '*';

  if (isDevelopment) {
    // In development, be more permissive
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // In production, only allow the Vercel deployment URL and our main domain
    const allowedOrigins = [
      vercelUrl ? `https://${vercelUrl}` : null,
      'https://aitoolboxv2.vercel.app',
      'https://www.aitoolboxv2.vercel.app'
    ].filter(Boolean) as string[];

    if (allowedOrigins.includes(origin) || allowedOrigins.some(allowed => origin.endsWith(allowed))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }

  // Common headers for both environments
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  let server: ReturnType<typeof registerRoutes> | undefined;
  
  try {
    // Initialize database first
    await initializeDatabase();
    log("Database initialized successfully");

    // Register API routes after database is ready
    server = registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      const stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;
      
      log(`Error: ${err.message}`);
      if (err.stack) {
        log(`Stack trace: ${err.stack}`);
      }
      
      res.status(status).json({ 
        message,
        stack,
        timestamp: new Date().toISOString()
      });
    });

    const isDevelopment = process.env.NODE_ENV === "development";
    
    if (isDevelopment) {
      log("Starting in development mode");
      await setupVite(app, server);
      log("API server running on port 5001");
      log("Visit http://localhost:3000 to access the application");
    } else {
      log("Starting in production mode with static file serving");
      serveStatic(app);
    }

    const PORT = parseInt(process.env.PORT || "5000", 10);
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running in ${isDevelopment ? "development" : "production"} mode on port ${PORT}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      log('SIGTERM signal received: closing HTTP server');
      if (server) {
        server.close(() => {
          log('HTTP server closed');
        });
      }
      await closeDatabase();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      log('SIGINT signal received: closing HTTP server');
      if (server) {
        server.close(() => {
          log('HTTP server closed');
        });
      }
      await closeDatabase();
      process.exit(0);
    });

  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (server) {
      server.close(() => {
        log('HTTP server closed due to error');
      });
    }
    await closeDatabase();
    process.exit(1);
  }
})();