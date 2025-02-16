import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase, closeDatabase } from "./db";
import { createServer } from "http";

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

// Initialize database and register routes
let isInitialized = false;
let initializationError: Error | null = null;

const initializeApp = async () => {
  if (initializationError) {
    throw initializationError;
  }
  
  if (!isInitialized) {
    try {
      log("Starting initialization...");
      log(`Environment: ${process.env.NODE_ENV}`);
      log(`Supabase URL: ${process.env.SUPABASE_URL}`);
      log(`Supabase Anon Key available: ${!!process.env.SUPABASE_ANON_KEY}`);
      log(`Supabase Service Role Key available: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
      
      await initializeDatabase();
      log("Database initialized successfully");
      isInitialized = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : undefined;
      
      log(`Database initialization error: ${errorMessage}`);
      if (stackTrace) {
        log(`Error stack trace: ${stackTrace}`);
      }
      
      initializationError = error instanceof Error 
        ? error 
        : new Error('Failed to initialize database');
        
      throw initializationError;
    }
  }
};

// Register routes
registerRoutes(app);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;
  
  // Always log the full error details
  log(`Error: ${err.message}`);
  if (err.stack) {
    log(`Stack trace: ${err.stack}`);
  }
  
  // In production, always include error details for debugging
  res.status(status).json({ 
    message,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    initialized: isInitialized,
    supabaseUrl: process.env.SUPABASE_URL,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
});

// Handle static files in production
if (process.env.NODE_ENV === 'production') {
  log("Starting in production mode with static file serving");
  serveStatic(app);
} else {
  log("Starting in development mode");
  setupVite(app, createServer(app));
}

// Initialize database before handling requests
app.use(async (req, res, next) => {
  try {
    await initializeApp();
    next();
  } catch (error) {
    next(error);
  }
});

// Export the Express app for Vercel
export default app;