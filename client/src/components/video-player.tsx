import ReactPlayer from "react-player";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video } from "@shared/schema";
import { useEffect } from "react";

interface VideoPlayerProps {
  video: Video;
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  // Log video data for debugging
  useEffect(() => {
    console.log('Video data received:', {
      ...video,
      videoData: video.videoData ? 'present' : 'null'
    });
  }, [video]);

  // Parse videoData if present
  let parsedVideoData = null;
  if (video.videoData) {
    try {
      parsedVideoData = JSON.parse(video.videoData);
    } catch (error) {
      console.error('Error parsing video data:', error);
    }
  }

  // Determine video source - either URL or base64 data
  const videoSource = video.url || 
    (parsedVideoData?.data ? `data:video/mp4;base64,${parsedVideoData.data}` : null);

  useEffect(() => {
    console.log('Video source:', videoSource ? 'present' : 'null');
  }, [videoSource]);

  if (!videoSource) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="aspect-video bg-muted flex items-center justify-center">
            <p className="text-muted-foreground">No video source available</p>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold mb-4">{video.title}</h1>
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <ReactPlayer
            url={videoSource}
            width="100%"
            height="100%"
            controls
            onError={(e) => console.error('ReactPlayer error:', e)}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-4">{video.title}</h1>
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