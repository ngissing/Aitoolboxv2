import ReactPlayer from "react-player";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video } from "@shared/schema";

interface VideoPlayerProps {
  video: Video;
}

export function VideoPlayer({ video }: VideoPlayerProps) {
  // Determine video source - either URL or base64 data
  const videoSource = video.url || 
    (video.videoData ? `data:video/mp4;base64,${JSON.parse(video.videoData).data}` : '');

  return (
    <div className="space-y-8">
      <div className="aspect-video">
        {videoSource && (
          <ReactPlayer
            url={videoSource}
            width="100%"
            height="100%"
            controls
          />
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold mb-4">{video.title}</h1>
        <p className="text-muted-foreground whitespace-pre-wrap">{video.description}</p>
      </div>

      <Card>
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">Transcript</h2>
          <ScrollArea className="h-[300px]">
            <p className="whitespace-pre-wrap text-sm">{video.transcript}</p>
          </ScrollArea>
        </div>
      </Card>
    </div>
  );
}