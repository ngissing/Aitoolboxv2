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
          allowedMimeTypes: ['video/mp4']
        });

      if (createError) {
        throw createError;
      }
      
      // Set up storage policies for the videos bucket
      const { error: policyError } = await supabase
        .storage
        .from('videos')
        .createSignedUrls(['dummy.txt'], 60); // This is just to test the bucket permissions

      if (policyError) {
        log(`Warning: Could not verify bucket permissions: ${policyError.message}`);
      }
      
      log('Created videos storage bucket');
    } else {
      log('Videos storage bucket already exists');
    }
  } catch (error) {
    log(`Error initializing storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

export async function initializeDatabase() {
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount < MAX_RETRIES) {
    try {
      // Test Supabase connection
      const { error } = await supabase
        .from('videos')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      // Initialize storage after database connection is established
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

      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount - 1);
        log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  log(`Failed to connect to database after ${MAX_RETRIES} attempts`);
  throw lastError;
}

export async function closeDatabase() {
  try {
    log("Database connection closed successfully");
  } catch (error) {
    log(`Error closing database connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
