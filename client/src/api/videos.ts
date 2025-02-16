import type { Database } from '../../../shared/supabase.types';

type Video = Database['public']['Tables']['videos']['Row'];

export async function fetchVideos(): Promise<Video[]> {
  try {
    const response = await fetch('/api/videos');
    if (!response.ok) {
      const errorData = await response.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
      } catch (e) {
        // If the error response is not JSON, include the raw response
        throw new Error(`API Error (${response.status}): ${errorData}`);
      }
      throw new Error(
        `API Error (${response.status}): ${parsedError.message}\n` +
        `Environment: ${JSON.stringify(parsedError.environment)}\n` +
        `Request: ${JSON.stringify(parsedError.request)}`
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw new Error(`Failed to fetch videos: ${error instanceof Error ? error.message : String(error)}`);
  }
} 