import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeDatabase } from "./db";
import { eq } from "drizzle-orm";
import { videos } from "@shared/schema";
import { log } from "./vite";

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

async function cleanup() {
  try {
    const { db } = await initializeDatabase();
    
    // Delete all uploaded videos
    const result = await db.delete(videos)
      .where(eq(videos.platform, 'upload'))
      .returning();
    
    log(`Deleted ${result.length} uploaded videos`);
    process.exit(0);
  } catch (error) {
    log(`Error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

cleanup(); 