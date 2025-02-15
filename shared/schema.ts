import { z } from "zod";
import { Database } from './supabase.types'

// Type from Supabase
export type Video = Database['public']['Tables']['videos']['Row']

// Validation schema for inserting/updating
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
  (data) => {
    // Either URL or videoData must be present
    return (data.url !== null) || (data.videoData !== null);
  },
  { message: "Either URL or video file must be provided" }
);

export type InsertVideo = z.infer<typeof insertVideoSchema>;

// Validation schema for video length categories
export const videoDurationCategories = {
  short: { max: 300 }, // 5 minutes
  medium: { min: 300, max: 900 }, // 5-15 minutes
  long: { min: 900 } // 15+ minutes
} as const;