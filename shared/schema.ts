import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  url: text("url").notNull(),
  thumbnail: text("thumbnail").notNull(),
  platform: text("platform", { enum: ["youtube", "vimeo", "mp4"] }).notNull(),
  duration: integer("duration").notNull(), // duration in seconds
  transcript: text("transcript").notNull(),
  tags: text("tags").array().notNull()
});

export const insertVideoSchema = createInsertSchema(videos).omit({ id: true });

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Validation schema for video length categories
export const videoDurationCategories = {
  short: { max: 300 }, // 5 minutes
  medium: { min: 300, max: 900 }, // 5-15 minutes
  long: { min: 900 } // 15+ minutes
} as const;
