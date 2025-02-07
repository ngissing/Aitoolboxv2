import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { VideoPlayer } from "@/components/video-player";
import { type Video } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export default function VideoPage() {
  const [, params] = useRoute("/video/:id");
  const videoId = params?.id;

  const { data: video, isLoading, error } = useQuery<Video>({
    queryKey: [`/api/videos/${videoId}`],
    enabled: !!videoId,
  });

  useEffect(() => {
    if (error) {
      console.error('Error fetching video:', error);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!video) {
    return <div>Video not found</div>;
  }

  return <VideoPlayer video={video} />;
}