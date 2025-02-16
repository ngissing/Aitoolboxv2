import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeDatabase } from './db';
import { log } from './vite';
import { supabase } from "./db";
import type { FileObject } from '@supabase/storage-js';

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

export async function cleanupUploads() {
  try {
    // Delete uploaded videos from the database
    const { data: videos, error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('platform', 'upload')
      .select();

    if (dbError) throw dbError;
    
    log(`Deleted ${videos?.length || 0} uploaded videos from database`);

    // Get list of files in storage
    const { data: files, error: listError } = await supabase
      .storage
      .from('videos')
      .list();

    if (listError) throw listError;

    if (!files || files.length === 0) {
      log('No files found in storage');
      return;
    }

    log(`Found ${files.length} files in storage`);

    // Delete each file
    const deletePromises = files.map(async (file: FileObject) => {
      try {
        const { error } = await supabase
          .storage
          .from('videos')
          .remove([file.name]);

        if (error) {
          log(`Error deleting file ${file.name}: ${error.message}`);
          return false;
        }
        
        log(`Deleted file ${file.name}`);
        return true;
      } catch (error) {
        log(`Error deleting file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
      }
    });

    const results = await Promise.all(deletePromises);
    const deletedCount = results.filter(Boolean).length;
    
    log(`Successfully deleted ${deletedCount} files from storage`);
  } catch (error) {
    log(`Error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

cleanup(); 