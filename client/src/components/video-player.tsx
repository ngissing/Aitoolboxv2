import ReactPlayer from "react-player";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Video, videoDurationCategories } from "@shared/schema";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    let blobUrl: string | null = null;

    const setupVideo = async () => {
      try {
        // For uploaded videos
        if (video.videoData) {
          let parsedData;
          try {
            // If it's already an object, use it directly
            if (typeof video.videoData === 'object') {
              parsedData = video.videoData;
            } else {
              // If it's a string, parse it
              parsedData = JSON.parse(video.videoData);
            }

            if (parsedData?.data) {
              // Convert base64 to blob
              const base64Data = parsedData.data;
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);

              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }

              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'video/mp4' });

              // Create blob URL
              blobUrl = URL.createObjectURL(blob);
              setVideoSource(blobUrl);
              console.log('Created blob URL for video data');
            } else {
              setError('Invalid video data format');
              console.error('Invalid video data format:', parsedData);
            }
          } catch (e) {
            console.error('Error parsing video data:', e);
            setError('Failed to parse video data');
          }
        }
        // For URL-based videos
        else if (video.url) {
          setVideoSource(video.url);
          console.log('Set video source from URL');
        }
        else {
          setError('No video source available');
        }
      } catch (e) {
        console.error('Error setting video source:', e);
        setError('Failed to load video');
      }
    };

    setupVideo();

    // Cleanup function
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        console.log('Revoked blob URL');
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

    if (!videoSource) {
      return (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      );
    }

    return (
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <ReactPlayer
          url={videoSource}
          width="100%"
          height="100%"
          controls
          onError={(e) => {
            console.error('ReactPlayer error:', e);
            setError('Failed to play video. Please try again later.');
          }}
        />
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
            <p className="whitespace-pre-wrap text-sm">{video.transcript}</p>
          </ScrollArea>
        </div>
      </Card>
    </div>
  );
}