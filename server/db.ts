import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

let supabase: SupabaseClient;

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
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.NODE_ENV === 'production' 
      ? process.env.SUPABASE_SERVICE_ROLE_KEY 
      : process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    log('Initializing Supabase client...');
    log(`Using Supabase URL: ${supabaseUrl}`);
    
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    });

    log('Testing database connection...');
    const { data, error } = await supabase.from('videos').select('id').limit(1);
    
    if (error) {
      throw error;
    }

    log('Database connection successful');
    
    // Initialize storage bucket
    log('Initializing storage bucket...');
    const { data: bucketData, error: bucketError } = await supabase
      .storage
      .getBucket('videos');

    if (bucketError) {
      log(`Error initializing storage bucket: ${JSON.stringify(bucketError)}`);
      throw bucketError;
    }

    log('Storage bucket initialized successfully');
    return true;
  } catch (error) {
    log(`Database initialization failed: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    throw error;
  }
}

export async function closeDatabase() {
  try {
    log("Database connection closed successfully");
  } catch (error) {
    log(`Error closing database connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
