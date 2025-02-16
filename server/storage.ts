import { type Video, type InsertVideo } from "@shared/schema";
import { supabase } from "./db";
import { log } from "./vite";

const BUCKET_NAME = 'videos';

export interface IStorage {
  getVideos(): Promise<Video[]>;
  getVideo(id: number): Promise<Video | null>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, video: Partial<InsertVideo>): Promise<Video | null>;
  deleteVideo(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getVideos(): Promise<Video[]> {
    try {
      log('Attempting to fetch videos from database...');
      const { data: allVideos, error } = await supabase
        .from('videos')
        .select('*');

      if (error) {
        log(`Database query error: ${error.message}`);
        log(`Error details: ${JSON.stringify(error, null, 2)}`);
        throw error;
      }

      if (!allVideos) {
        log('No videos found in database');
        return [];
      }
      
      log(`Found ${allVideos.length} videos in database`);
      
      // Process videos to get storage URLs for uploaded videos
      const processedVideos = await Promise.all(allVideos.map(async (video: Video) => {
        try {
          const baseVideo = {
            ...video,
            video_date: video.video_date
          };

          if (video.platform === 'upload' && typeof video.video_data === 'string') {
            try {
              log(`Getting public URL for uploaded video ${video.id}`);
              const { data: { publicUrl } } = supabase
                .storage
                .from(BUCKET_NAME)
                .getPublicUrl(video.video_data);
              
              log(`Got public URL for video ${video.id}: ${publicUrl}`);
              return {
                ...baseVideo,
                url: publicUrl,
                video_data: null
              };
            } catch (err) {
              log(`Error getting public URL for video ${video.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
              if (err instanceof Error && err.stack) {
                log(`Stack trace: ${err.stack}`);
              }
              return baseVideo;
            }
          }
          return baseVideo;
        } catch (err) {
          log(`Error processing video ${video.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          if (err instanceof Error && err.stack) {
            log(`Stack trace: ${err.stack}`);
          }
          return video;
        }
      }));
      
      log(`Successfully processed ${processedVideos.length} videos`);
      return processedVideos;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const stackTrace = error instanceof Error ? error.stack : undefined;
      
      log(`Error retrieving videos: ${errorMessage}`);
      if (stackTrace) {
        log(`Stack trace: ${stackTrace}`);
      }
      
      // Log the full error object for debugging
      if (error && typeof error === 'object') {
        log(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
      }
      
      throw new Error(`Failed to retrieve videos: ${errorMessage}`);
    }
  }

  async getVideo(id: number): Promise<Video | null> {
    try {
      const { data: video, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return video;
    } catch (error) {
      log(`Error fetching video ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    try {
      log('Creating video...');
      log(`Insert data: ${JSON.stringify(insertVideo)}`);

      // Handle video data if present
      if (insertVideo.video_data) {
        const { data, filename } = insertVideo.video_data;
        log(`Processing video data with filename: ${filename}`);
      }

      const { data: result, error } = await supabase
        .from('videos')
        .insert({
          title: insertVideo.title,
          description: insertVideo.description,
          url: insertVideo.url,
          video_data: insertVideo.video_data,
          thumbnail: insertVideo.thumbnail,
          platform: insertVideo.platform,
          duration: insertVideo.duration,
          transcript: insertVideo.transcript,
          tags: insertVideo.tags,
          video_date: insertVideo.video_date ? new Date(insertVideo.video_date).toISOString() : null
        })
        .select()
        .single();

      if (error) throw error;
      if (!result) throw new Error('No data returned from insert');

      log(`Video created successfully with ID: ${result.id}`);
      return result;
    } catch (error) {
      log(`Error creating video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async updateVideo(id: number, updateVideo: Partial<InsertVideo>): Promise<Video | null> {
    try {
      log(`Updating video ${id}...`);
      log(`Update data: ${JSON.stringify(updateVideo)}`);

      // Get the existing video first
      const dbVideo = await this.getVideo(id);
      if (!dbVideo) {
        log(`Video ${id} not found`);
        return null;
      }

      // Handle video data if present
      if (updateVideo.video_data) {
        const { data, filename } = updateVideo.video_data;
        log(`Processing video data with filename: ${filename}`);
      }

      // Update only the fields that are provided
      if (updateVideo.title !== undefined) dbVideo.title = updateVideo.title;
      if (updateVideo.description !== undefined) dbVideo.description = updateVideo.description;
      if (updateVideo.url !== undefined) dbVideo.url = updateVideo.url;
      if (updateVideo.video_data !== undefined) dbVideo.video_data = updateVideo.video_data;
      if (updateVideo.thumbnail !== undefined) dbVideo.thumbnail = updateVideo.thumbnail;
      if (updateVideo.platform !== undefined) dbVideo.platform = updateVideo.platform;
      if (updateVideo.duration !== undefined) dbVideo.duration = updateVideo.duration;
      if (updateVideo.transcript !== undefined) dbVideo.transcript = updateVideo.transcript;
      if (updateVideo.tags !== undefined) dbVideo.tags = updateVideo.tags;
      if (updateVideo.video_date !== undefined) {
        dbVideo.video_date = updateVideo.video_date ? new Date(updateVideo.video_date).toISOString() : null;
      }

      // Only proceed with update if there are fields to update
      if (Object.keys(dbVideo).length === 0) {
        log(`No fields to update for video ${id}`);
        return dbVideo;
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
        return video;
      }
      
      log(`No video found after update for id ${id}`);
      return null;
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
      if (video.platform === 'upload' && typeof video.video_data === 'string') {
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