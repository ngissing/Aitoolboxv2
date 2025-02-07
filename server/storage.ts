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
    const [video] = await db
      .insert(videos)
      .values(insertVideo)
      .returning();
    return video;
  }

  async updateVideo(id: number, updateVideo: Partial<InsertVideo>): Promise<Video | undefined> {
    const [video] = await db
      .update(videos)
      .set(updateVideo)
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