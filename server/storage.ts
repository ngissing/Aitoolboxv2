import { videos, type Video, type InsertVideo } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { log } from "./vite";

export interface IStorage {
  getVideos(): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, video: Partial<InsertVideo>): Promise<Video | undefined>;
  deleteVideo(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getVideos(): Promise<Video[]> {
    try {
      const allVideos = await db.select().from(videos);
      log(`Retrieved ${allVideos.length} videos from database`);
      // Log each video for debugging (excluding large videoData)
      allVideos.forEach(video => {
        log(`Video ${video.id}: ${JSON.stringify({
          ...video,
          videoData: video.videoData ? '[PRESENT]' : null
        })}`);
      });
      return allVideos;
    } catch (error) {
      log(`Error retrieving videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getVideo(id: number): Promise<Video | undefined> {
    try {
      const [video] = await db.select().from(videos).where(eq(videos.id, id));
      log(`Retrieved video with id ${id}: ${video ? 'found' : 'not found'}`);
      if (video) {
        log(`Video details: ${JSON.stringify({
          ...video,
          videoData: video.videoData ? '[PRESENT]' : null
        })}`);
      }
      return video;
    } catch (error) {
      log(`Error retrieving video ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    try {
      // Handle videoData properly
      const dbVideo = {
        ...insertVideo,
        // If videoData is present, stringify it once
        videoData: insertVideo.videoData ? JSON.stringify(insertVideo.videoData) : null,
        // Ensure tags is an array
        tags: Array.isArray(insertVideo.tags) ? insertVideo.tags : []
      };

      log(`Creating video with title: ${dbVideo.title}`);
      log(`Video data to insert: ${JSON.stringify({
        ...dbVideo,
        videoData: dbVideo.videoData ? '[PRESENT]' : null
      })}`);

      const [video] = await db
        .insert(videos)
        .values(dbVideo)
        .returning();

      log(`Successfully created video with id: ${video.id}`);
      return video;
    } catch (error) {
      log(`Error creating video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async updateVideo(id: number, updateVideo: Partial<InsertVideo>): Promise<Video | undefined> {
    try {
      // Handle videoData properly
      const dbVideo = {
        ...updateVideo,
        // If videoData is present, stringify it once
        videoData: updateVideo.videoData ? JSON.stringify(updateVideo.videoData) : undefined,
        // Ensure tags is an array if present
        tags: updateVideo.tags ? Array.isArray(updateVideo.tags) ? updateVideo.tags : [] : undefined
      };

      log(`Updating video ${id}`);
      const [video] = await db
        .update(videos)
        .set(dbVideo)
        .where(eq(videos.id, id))
        .returning();

      log(`Successfully updated video ${id}`);
      return video;
    } catch (error) {
      log(`Error updating video ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async deleteVideo(id: number): Promise<boolean> {
    try {
      const [deleted] = await db
        .delete(videos)
        .where(eq(videos.id, id))
        .returning();
      log(`Deleted video ${id}: ${!!deleted}`);
      return !!deleted;
    } catch (error) {
      log(`Error deleting video ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();