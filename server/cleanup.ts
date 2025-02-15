import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeDatabase } from './db';
import { log } from './vite';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

export async function cleanup() {
  try {
    log('Starting cleanup...');
    const { supabase } = await initializeDatabase();

    // Delete all videos from storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .listBuckets();

    if (storageError) {
      throw storageError;
    }

    for (const bucket of storageData) {
      const { data: files, error: listError } = await supabase
        .storage
        .from(bucket.name)
        .list();

      if (listError) {
        log(`Error listing files in bucket ${bucket.name}: ${listError.message}`);
        continue;
      }

      if (files && files.length > 0) {
        const { error: deleteError } = await supabase
          .storage
          .from(bucket.name)
          .remove(files.map(file => file.name));

        if (deleteError) {
          log(`Error deleting files from bucket ${bucket.name}: ${deleteError.message}`);
        } else {
          log(`Deleted ${files.length} files from bucket ${bucket.name}`);
        }
      }
    }

    // Delete all videos from database
    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .neq('id', 0);

    if (dbError) {
      throw dbError;
    }

    log('Cleanup completed successfully');
  } catch (error) {
    log(`Error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

cleanup(); 