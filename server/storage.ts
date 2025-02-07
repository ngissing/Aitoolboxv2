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
      return video;
    } catch (error) {
      log(`Error retrieving video ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    try {
      // Convert the videoData object to a JSON string if present
      const dbVideo = {
        ...insertVideo,
        videoData: insertVideo.videoData ? JSON.stringify(insertVideo.videoData) : null
      };

      log(`Creating video with title: ${dbVideo.title}`);
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
      // Convert the videoData object to a JSON string if present
      const dbVideo = {
        ...updateVideo,
        videoData: updateVideo.videoData ? JSON.stringify(updateVideo.videoData) : null
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