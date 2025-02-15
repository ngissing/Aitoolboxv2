import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVideoSchema } from "@shared/schema";
import { z } from "zod";
import { log } from "./vite";
import { supabase } from "./db";

// Create a partial schema for updates by making all fields optional
const updateVideoSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  url: z.string().nullable().optional(),
  videoData: z.object({
    data: z.string(),
    filename: z.string()
  }).nullable().optional(),
  platform: z.string().min(1, "Platform is required").optional(),
  duration: z.number().min(0).optional(),
  transcript: z.string().min(1, "Transcript is required").optional(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().min(1, "Thumbnail URL is required").optional(),
  videoDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]).optional()
});

export function registerRoutes(app: Express): Server {
  // Get all videos
  app.get("/api/videos", async (_req, res) => {
    try {
      const videos = await storage.getVideos();
      res.json(videos);
    } catch (error) {
      log(`Error fetching videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        log(`Error stack trace: ${error.stack}`);
      }
      
      res.status(500).json({
        message: "Failed to fetch videos",
        error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get single video
  app.get("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.getVideo(id);
      if (!video) {
        res.status(404).json({ message: "Video not found" });
        return;
      }
      log(`Retrieved video: ${JSON.stringify({ ...video, videoData: video.videoData ? '[TRUNCATED]' : null })}`);
      res.json(video);
    } catch (error) {
      log(`Error getting video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: "Failed to get video" });
    }
  });

  // Create video
  app.post("/api/videos", async (req, res) => {
    try {
      log("Received video creation request");
      log(`Request body: ${JSON.stringify(req.body)}`);

      // Validate the request body
      const video = insertVideoSchema.parse(req.body);
      log("Video data validated successfully");

      // Attempt to create the video
      const created = await storage.createVideo(video);
      log(`Video created successfully with ID: ${created.id}`);
      res.status(201).json(created);
    } catch (error) {
      // Log the full error details
      log(`Error creating video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        log(`Error stack trace: ${error.stack}`);
      }

      // Send appropriate error response
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: "Invalid video data",
          errors: error.errors,
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message
          }))
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create video';
        res.status(500).json({
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    }
  });

  // Update video
  app.patch("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      log(`Received update request for video ${id}`);
      log(`Update data: ${JSON.stringify(req.body, null, 2)}`);

      const video = updateVideoSchema.parse(req.body);
      log(`Validated update data for video ${id}: ${JSON.stringify(video, null, 2)}`);

      const updated = await storage.updateVideo(id, video);
      if (!updated) {
        log(`Video ${id} not found for update`);
        res.status(404).json({ message: "Video not found" });
        return;
      }
      
      log(`Successfully updated video ${id}`);
      res.json(updated);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : undefined;
      
      log(`Error updating video: ${errorMessage}`);
      if (stackTrace) {
        log(`Error stack trace: ${stackTrace}`);
      }
      log(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);

      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid video data", 
          errors: error.errors,
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message
          }))
        });
      } else {
        res.status(500).json({ 
          message: "Failed to update video",
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          details: process.env.NODE_ENV === 'development' ? error : undefined
        });
      }
    }
  });

  // Delete video
  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteVideo(id);
      if (!deleted) {
        res.status(404).json({ message: "Video not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  // Cleanup endpoint to remove uploaded videos
  app.post("/api/cleanup", async (_req, res) => {
    try {
      const { data: result, error } = await supabase
        .from('videos')
        .delete()
        .eq('platform', 'upload')
        .select();

      if (error) throw error;
      
      log(`Deleted ${result?.length || 0} uploaded videos`);
      res.json({ message: `Deleted ${result?.length || 0} uploaded videos` });
    } catch (error) {
      log(`Error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: "Failed to cleanup videos" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}