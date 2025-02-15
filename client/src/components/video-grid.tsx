import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, videoDurationCategories } from "@shared/schema";
import { Link } from "wouter";
import { format } from "date-fns";

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
  if (duration <= videoDurationCategories.short.max) return "Short (0-5m)";
  if (duration <= videoDurationCategories.medium.max) return "Medium (5-15m)";
  return "Long (15m+)";
}

interface VideoGridProps {
  videos: Video[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  // Sort videos by video_date in descending order (newest first)
  const sortedVideos = [...videos].sort((a, b) => {
    if (!a.video_date) return 1;  // Videos without dates go to the end
    if (!b.video_date) return -1;
    return new Date(b.video_date).getTime() - new Date(a.video_date).getTime();
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedVideos.map((video) => (
        <Link key={video.id} href={`/video/${video.id}`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-4">
              <div className="aspect-video relative mb-4">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="rounded-md object-cover w-full h-full"
                />
                <Badge className="absolute bottom-2 right-2">
                  {formatDuration(video.duration)}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{video.title}</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{video.platform}</Badge>
                <Badge variant="outline">{getDurationCategory(video.duration)}</Badge>
                {video.video_date && (
                  <Badge variant="outline" className="ml-auto">
                    {format(new Date(video.video_date), "dd MMMM yy")}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {video.tags.slice(0, 2).map((tag: string) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
