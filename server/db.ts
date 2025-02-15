import { createClient } from '@supabase/supabase-js';
import * as schema from "@shared/schema";
import { log } from "./vite";

const supabaseUrl = process.env.SUPABASE_URL || 'https://nhjbqjvqorlavjfhuicy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

log(`Initializing Supabase client with URL: ${supabaseUrl}`);
log(`Using service role key: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
log(`Using anon key: ${!!process.env.SUPABASE_ANON_KEY}`);

if (!supabaseKey) {
  const error = new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set in your environment variables");
  log(`Database initialization error: ${error.message}`);
  throw error;
}

// Create Supabase client for auth and realtime features
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey
    }
  }
});

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function initializeStorage() {
  try {
    // Check if the videos bucket exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();

    if (listError) {
      throw listError;
    }

    const videosBucket = buckets?.find(bucket => bucket.name === 'videos');
    
    if (!videosBucket) {
      // Create the videos bucket if it doesn't exist
      const { error: createError } = await supabase
        .storage
        .createBucket('videos', {
          public: true, // Make the bucket public
          fileSizeLimit: 52428800, // 50MB in bytes
          allowedMimeTypes: ['video/mp4', 'video/webm']
        });

      if (createError) {
        throw createError;
      }

      // Update bucket policies to allow public access
      const { error: policyError } = await supabase
        .storage
        .updateBucket('videos', {
          public: true,
          allowedMimeTypes: ['video/mp4', 'video/webm'],
          fileSizeLimit: 52428800
        });

      if (policyError) {
        log(`Warning: Could not update bucket policies: ${policyError.message}`);
      }
      
      log('Created and configured videos storage bucket');
    } else {
      // Update existing bucket policies
      const { error: policyError } = await supabase
        .storage
        .updateBucket('videos', {
          public: true,
          allowedMimeTypes: ['video/mp4', 'video/webm'],
          fileSizeLimit: 52428800
        });

      if (policyError) {
        log(`Warning: Could not update bucket policies: ${policyError.message}`);
      }
      
      log('Updated videos storage bucket configuration');
    }
  } catch (error) {
    log(`Error initializing storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

export async function initializeDatabase() {
  let retryCount = 0;
  let lastError: Error | null = null;

  log('Starting database initialization...');
  log(`Environment: ${process.env.NODE_ENV}`);
  log(`Database URL: ${supabaseUrl}`);
  log(`Service Role Key available: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
  log(`Anon Key available: ${!!process.env.SUPABASE_ANON_KEY}`);

  while (retryCount < MAX_RETRIES) {
    try {
      log(`Attempt ${retryCount + 1}/${MAX_RETRIES} to connect to database...`);
      
      // Test Supabase connection
      const { data, error } = await supabase
        .from('videos')
        .select('count')
        .limit(1);

      if (error) {
        log(`Database query error: ${error.message}`);
        log(`Error details: ${JSON.stringify(error, null, 2)}`);
        throw error;
      }

      log(`Database query successful. Count result: ${JSON.stringify(data)}`);

      // Initialize storage after database connection is established
      log('Initializing storage...');
      await initializeStorage();

      log(`Database connection established successfully after ${retryCount} retries`);
      return { supabase };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      retryCount++;
      
      log(`Database connection attempt ${retryCount} failed: ${lastError.message}`);
      if (lastError.stack) {
        log(`Error stack trace: ${lastError.stack}`);
      }

      // Log additional error details if available
      if (error && typeof error === 'object') {
        log(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
      }

      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1);
        log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  log(`Failed to connect to database after ${MAX_RETRIES} attempts`);
  if (lastError) {
    log(`Final error: ${lastError.message}`);
    log(`Final error stack: ${lastError.stack}`);
  }
  throw lastError;
}

export async function closeDatabase() {
  try {
    log("Database connection closed successfully");
  } catch (error) {
    log(`Error closing database connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
