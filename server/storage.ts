import { type Video, type InsertVideo } from "@shared/schema";
import { supabase } from "./db";
import { log } from "./vite";

const BUCKET_NAME = 'videos';

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
      const { data: allVideos, error } = await supabase
        .from('videos')
        .select('*');

      if (error) throw error;
      
      // Process videos to get storage URLs for uploaded videos
      const processedVideos = await Promise.all(allVideos.map(async video => {
        const baseVideo = {
          ...video,
          videoDate: video.video_date // Map snake_case to camelCase
        };

        if (video.platform === 'upload' && video.video_data) {
          try {
            const { data: { publicUrl } } = supabase
              .storage
              .from(BUCKET_NAME)
              .getPublicUrl(video.video_data);
            
            return {
              ...baseVideo,
              url: publicUrl,
              videoData: null // Clear the video data as we now have the URL
            };
          } catch (err) {
            log(`Error getting public URL for video ${video.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            return baseVideo;
          }
        }
        return baseVideo;
      }));
      
      log(`Retrieved ${processedVideos.length} videos from database`);
      return processedVideos;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : undefined;
      
      log(`Error retrieving videos: ${errorMessage}`);
      if (stackTrace) {
        log(`Stack trace: ${stackTrace}`);
      }
      
      throw new Error(`Failed to retrieve videos: ${errorMessage}`);
    }
  }

  async getVideo(id: number): Promise<Video | undefined> {
    try {
      const { data: videos, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .limit(1);

      if (error) throw error;

      const video = videos?.[0];
      if (video) {
        const baseVideo = {
          ...video,
          videoDate: video.video_date // Map snake_case to camelCase
        };

        // Get storage URL for uploaded videos
        if (video.platform === 'upload' && video.video_data) {
          try {
            const { data: { publicUrl } } = supabase
              .storage
              .from(BUCKET_NAME)
              .getPublicUrl(video.video_data);
            
            return {
              ...baseVideo,
              url: publicUrl,
              videoData: null // Clear the video data as we now have the URL
            };
          } catch (err) {
            log(`Error getting public URL for video ${id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            return baseVideo;
          }
        }
        return baseVideo;
      }
      return undefined;
    } catch (error) {
      log(`Error retrieving video ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    try {
      log("Starting video creation...");
      
      let videoPath: string | null = null;
      
      // If this is an uploaded video, store it in Supabase Storage
      if (insertVideo.videoData) {
        const { data, filename } = insertVideo.videoData;
        const buffer = Buffer.from(data, 'base64');
        const path = `uploads/${Date.now()}-${filename}`;
        
        log(`Uploading video to storage: ${path}`);
        const { error: uploadError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .upload(path, buffer, {
            contentType: 'video/mp4',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Failed to upload video: ${uploadError.message}`);
        }
        
        videoPath = path;
        log(`Video uploaded successfully to: ${path}`);
      }

      // Create the database record
      const dbVideo = {
        title: insertVideo.title,
        description: insertVideo.description,
        url: insertVideo.url,
        video_data: videoPath, // Store the storage path instead of the video data
        thumbnail: insertVideo.thumbnail,
        platform: insertVideo.platform,
        duration: insertVideo.duration,
        transcript: insertVideo.transcript,
        tags: insertVideo.tags,
        video_date: insertVideo.videoDate ? new Date(insertVideo.videoDate).toISOString() : null
      };

      const { data: videos, error } = await supabase
        .from('videos')
        .insert(dbVideo)
        .select()
        .limit(1);

      if (error) throw error;
      
      const video = videos?.[0];
      if (!video) {
        throw new Error("No video returned after insert");
      }

      // If it's an uploaded video, get the public URL
      if (video.platform === 'upload' && video.video_data) {
        const { data: { publicUrl } } = supabase
          .storage
          .from(BUCKET_NAME)
          .getPublicUrl(video.video_data);
        
        return {
          ...video,
          url: publicUrl,
          videoData: null, // Clear the video data as we now have the URL
          videoDate: video.video_date // Map snake_case to camelCase
        };
      }

      return {
        ...video,
        videoDate: video.video_date // Map snake_case to camelCase
      };
    } catch (error) {
      log(`Error creating video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      log(`Error details: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
      throw error;
    }
  }

  async updateVideo(id: number, updateVideo: Partial<InsertVideo>): Promise<Video | undefined> {
    try {
      log(`Starting update for video ${id}`);
      log(`Update data: ${JSON.stringify(updateVideo, null, 2)}`);
      
      // First, check if the video exists
      const { data: existingVideos, error: getError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .limit(1);

      if (getError) {
        log(`Error fetching existing video: ${getError.message}`);
        throw getError;
      }

      if (!existingVideos || existingVideos.length === 0) {
        log(`No video found with id ${id}`);
        return undefined;
      }

      let videoPath: string | null = null;
      
      // If this is an uploaded video, store it in Supabase Storage
      if (updateVideo.videoData) {
        const { data, filename } = updateVideo.videoData;
        const buffer = Buffer.from(data, 'base64');
        const path = `uploads/${Date.now()}-${filename}`;
        
        log(`Uploading video to storage: ${path}`);
        const { error: uploadError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .upload(path, buffer, {
            contentType: 'video/mp4',
            upsert: false
          });

        if (uploadError) {
          log(`Error uploading video: ${uploadError.message}`);
          throw new Error(`Failed to upload video: ${uploadError.message}`);
        }
        
        videoPath = path;
        log(`Video uploaded successfully to: ${path}`);
      }

      // Prepare the video data for update
      const dbVideo: Record<string, any> = {};
      
      if ('title' in updateVideo) dbVideo.title = updateVideo.title;
      if ('description' in updateVideo) dbVideo.description = updateVideo.description;
      if ('url' in updateVideo) dbVideo.url = updateVideo.url;
      if (videoPath !== null) dbVideo.video_data = videoPath;
      if ('thumbnail' in updateVideo) dbVideo.thumbnail = updateVideo.thumbnail;
      if ('platform' in updateVideo) dbVideo.platform = updateVideo.platform;
      if ('duration' in updateVideo) dbVideo.duration = updateVideo.duration;
      if ('transcript' in updateVideo) dbVideo.transcript = updateVideo.transcript;
      if ('tags' in updateVideo) dbVideo.tags = updateVideo.tags;

      // Only proceed with update if there are fields to update
      if (Object.keys(dbVideo).length === 0) {
        log(`No fields to update for video ${id}`);
        return existingVideos[0];
      }

      // Add videoDate if present
      if ('videoDate' in updateVideo) {
        dbVideo.video_date = updateVideo.videoDate ? new Date(updateVideo.videoDate).toISOString() : null;
      }

      log(`Updating video ${id} with fields: ${Object.keys(dbVideo).join(', ')}`);
      
      const { data: videos, error: updateError } = await supabase
        .from('videos')
        .update(dbVideo)
        .eq('id', id)
        .select();

      if (updateError) {
        log(`Error updating video in database: ${updateError.message}`);
        log(`Error details: ${JSON.stringify(updateError, null, 2)}`);
        throw updateError;
      }

      const video = videos?.[0];
      if (video) {
        log(`Successfully updated video ${id}`);
        // If it's an uploaded video, get the public URL
        if (video.platform === 'upload' && video.video_data) {
          log(`Getting public URL for uploaded video: ${video.video_data}`);
          const { data: { publicUrl } } = supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(video.video_data);
          
          return {
            ...video,
            url: publicUrl,
            videoData: null, // Clear the video data as we now have the URL
            videoDate: video.video_date // Map snake_case to camelCase
          };
        }
        return video;
      }
      
      log(`No video found after update for id ${id}`);
      return undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : undefined;
      
      log(`Error updating video ${id}: ${errorMessage}`);
      if (stackTrace) {
        log(`Error stack trace: ${stackTrace}`);
      }
      log(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
      throw error;
    }
  }

  async deleteVideo(id: number): Promise<boolean> {
    try {
      log(`Starting deletion of video ${id}`);
      
      // First get the video to check if it has an uploaded file
      const { data: videos, error: getError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .limit(1);

      if (getError) {
        log(`Error fetching video ${id} for deletion: ${getError.message}`);
        throw getError;
      }

      const video = videos?.[0];
      if (!video) {
        log(`Video ${id} not found for deletion`);
        return false;
      }

      // If it's an uploaded video, delete the file from storage
      if (video.platform === 'upload' && video.video_data) {
        log(`Attempting to delete video file from storage: ${video.video_data}`);
        const { error: deleteStorageError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .remove([video.video_data]);

        if (deleteStorageError) {
          log(`Error deleting video file from storage: ${deleteStorageError.message}`);
          // Continue with database deletion even if storage deletion fails
        } else {
          log(`Successfully deleted video file from storage: ${video.video_data}`);
        }
      }

      // Delete the database record
      log(`Attempting to delete video ${id} from database`);
      const { data: deleted, error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('id', id)
        .select();

      if (deleteError) {
        log(`Error deleting video ${id} from database: ${deleteError.message}`);
        throw deleteError;
      }

      const wasDeleted = !!deleted?.[0];
      log(`Deleted video ${id} from database: ${wasDeleted}`);
      return wasDeleted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : undefined;
      
      log(`Error deleting video ${id}: ${errorMessage}`);
      if (stackTrace) {
        log(`Error stack trace: ${stackTrace}`);
      }
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();