import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  url: text("url"),
  videoData: text("video_data"),  // Store video data as Base64 encoded string
  thumbnail: text("thumbnail").notNull(),
  platform: text("platform").notNull(),
  duration: integer("duration").notNull(), // duration in seconds
  transcript: text("transcript").notNull(),
  tags: text("tags").array().notNull(),
  videoDate: timestamp("video_date", { withTimezone: true }), // This maps video_date to videoDate
});

type VideoData = {
  title: string;
  description: string;
  url: string | null;
  videoData: { data: string; filename: string } | null;
  thumbnail: string;
  platform: string;
  duration: number;
  transcript: string;
  tags: string[];
  videoDate: Date | null;
};

// Create a combined schema that handles both URL and file upload cases
export const insertVideoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  url: z.string().nullable(),
  videoData: z.object({
    data: z.string(),
    filename: z.string()
  }).nullable(),
  thumbnail: z.string().min(1, "Thumbnail URL is required"),
  platform: z.string().min(1, "Platform is required"),
  duration: z.number().min(0),
  transcript: z.string()
    .min(1, "Transcript is required")
    .transform((text: string) => text.replace(/\r\n/g, '\n')), // Normalize line endings
  tags: z.array(z.string()),
  videoDate: z.union([
    z.string().transform((str: string) => new Date(str)),
    z.date(),
    z.null()
  ])
}).refine(
  (data: VideoData) => {
    // Either URL or videoData must be present
    return (data.url !== null) || (data.videoData !== null);
  },
  { message: "Either URL or video file must be provided" }
);

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Validation schema for video length categories
export const videoDurationCategories = {
  short: { max: 300 }, // 5 minutes
  medium: { min: 300, max: 900 }, // 5-15 minutes
  long: { min: 900 } // 15+ minutes
} as const;