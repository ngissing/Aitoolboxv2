import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVideoSchema } from "@shared/schema";
import { z } from "zod";
import { log } from "./vite";

export function registerRoutes(app: Express): Server {
  // Get all videos
  app.get("/api/videos", async (_req, res) => {
    const videos = await storage.getVideos();
    res.json(videos);
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
      const video = insertVideoSchema.parse(req.body);
      const created = await storage.createVideo(video);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid video data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create video" });
      }
    }
  });

  // Update video
  app.patch("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const video = insertVideoSchema.partial().parse(req.body);
      const updated = await storage.updateVideo(id, video);
      if (!updated) {
        res.status(404).json({ message: "Video not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid video data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update video" });
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

  const httpServer = createServer(app);
  return httpServer;
}