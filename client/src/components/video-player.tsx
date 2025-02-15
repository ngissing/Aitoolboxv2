import ReactPlayer from "react-player/lazy";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Video, videoDurationCategories } from "@shared/schema";
import { useEffect, useState, useRef, Suspense } from "react";

interface VideoPlayerProps {
  video: Video;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function getDurationCategory(duration: number): string {
  if (duration <= videoDurationCategories.short.max) return "Short";
  if (duration <= videoDurationCategories.medium.max) return "Medium";
  return "Long";
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const blobUrlRef = useRef<string | null>(null);
  const [isUploadedVideo, setIsUploadedVideo] = useState(false);

  useEffect(() => {
    const setupVideo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setIsUploadedVideo(false);

        // Clean up previous blob URL if it exists
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }

        // For YouTube videos
        if (video.platform === 'youtube') {
          const youtubeUrl = video.url;
          if (!youtubeUrl) {
            throw new Error('YouTube URL is missing');
          }
          setVideoSource(youtubeUrl);
          setIsLoading(false);
          return;
        }

        // For uploaded videos
        if (video.videoData) {
          try {
            let parsedData = typeof video.videoData === 'string' 
              ? JSON.parse(video.videoData)
              : video.videoData;

            // Handle double-stringified data
            if (typeof parsedData === 'string') {
              parsedData = JSON.parse(parsedData);
            }

            if (!parsedData?.data) {
              throw new Error('Video data is missing required data field');
            }

            // Get the base64 data
            let base64Data = parsedData.data;
            
            // Remove any data URL prefix if present
            const base64Prefix = 'base64,';
            const prefixIndex = base64Data.indexOf(base64Prefix);
            if (prefixIndex !== -1) {
              base64Data = base64Data.substring(prefixIndex + base64Prefix.length);
            }

            // Remove any whitespace
            base64Data = base64Data.trim();

            // Create blob with appropriate MIME type
            const mimeType = parsedData.filename?.toLowerCase().endsWith('.mp4') 
              ? 'video/mp4' 
              : 'video/webm';

            // Convert base64 to blob using Fetch API
            const response = await fetch(`data:${mimeType};base64,${base64Data}`);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            blobUrlRef.current = blobUrl;
            setVideoSource(blobUrl);
            setIsUploadedVideo(true);
          } catch (err) {
            console.error('Error processing video data:', err);
            throw new Error('Failed to process video data');
          }
        } else if (video.url) {
          // For direct URL videos (mp4 or other)
          setVideoSource(video.url);
        } else {
          throw new Error('No video source available');
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error setting up video:', err);
        setError(err instanceof Error ? err.message : 'Failed to load video');
        setIsLoading(false);
      }
    };

    setupVideo();

    // Cleanup function
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [video]);

  const renderVideoContent = () => {
    if (error) {
      return (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <p className="text-muted-foreground">{error}</p>
        </div>
      );
    }

    if (isLoading || !videoSource) {
      return (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      );
    }

    if (isUploadedVideo) {
      return (
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <video
            src={videoSource}
            className="w-full h-full"
            controls
            controlsList="nodownload"
            onError={(e) => {
              const videoElement = e.target as HTMLVideoElement;
              const errorMessage = videoElement.error?.message || 'Unknown error';
              console.error('Video playback error:', errorMessage);
              setError(`Failed to play video: ${errorMessage}`);
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <Suspense fallback={
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <p className="text-muted-foreground">Loading video player...</p>
          </div>
        }>
          <ReactPlayer
            url={videoSource}
            width="100%"
            height="100%"
            controls
            playing={false}
            onError={(e: Error) => {
              console.error('ReactPlayer error:', e);
              setError('Failed to play video. Please try again later.');
            }}
            config={{
              file: {
                attributes: {
                  controlsList: 'nodownload'
                }
              },
              youtube: {
                playerVars: { 
                  origin: window.location.origin,
                  enablejsapi: 1,
                  modestbranding: 1,
                  rel: 0
                }
              }
            }}
            fallback={
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <p className="text-muted-foreground">Unable to load video player. Please try refreshing the page.</p>
              </div>
            }
          />
        </Suspense>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {renderVideoContent()}
        <div>
          <h1 className="text-3xl font-bold mb-4">{video.title}</h1>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">{video.platform}</Badge>
            <Badge variant="outline">{formatDuration(video.duration)}</Badge>
            <Badge variant="outline">{getDurationCategory(video.duration)}</Badge>
            {video.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
          <p className="text-muted-foreground whitespace-pre-wrap">{video.description}</p>
        </div>
      </div>

      <Card className="h-full">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Transcript</h2>
          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="whitespace-pre-wrap text-sm">
              {video.transcript.split('\n').map((paragraph, index) => (
                paragraph.trim() ? (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ) : <br key={index} />
              ))}
            </div>
          </ScrollArea>
        </div>
      </Card>
    </div>
  );
}