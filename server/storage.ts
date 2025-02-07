import { videos, type Video, type InsertVideo } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getVideos(): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, video: Partial<InsertVideo>): Promise<Video | undefined>;
  deleteVideo(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getVideos(): Promise<Video[]> {
    return await db.select().from(videos);
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    // Convert the videoData object to a JSON string if present
    const dbVideo = {
      ...insertVideo,
      videoData: insertVideo.videoData ? JSON.stringify(insertVideo.videoData) : null
    };

    const [video] = await db
      .insert(videos)
      .values(dbVideo)
      .returning();
    return video;
  }

  async updateVideo(id: number, updateVideo: Partial<InsertVideo>): Promise<Video | undefined> {
    // Convert the videoData object to a JSON string if present
    const dbVideo = {
      ...updateVideo,
      videoData: updateVideo.videoData ? JSON.stringify(updateVideo.videoData) : null
    };

    const [video] = await db
      .update(videos)
      .set(dbVideo)
      .where(eq(videos.id, id))
      .returning();
    return video;
  }

  async deleteVideo(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(videos)
      .where(eq(videos.id, id))
      .returning();
    return !!deleted;
  }
}

export const storage = new DatabaseStorage();