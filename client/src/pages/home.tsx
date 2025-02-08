import { useQuery } from "@tanstack/react-query";
import { Video, videoDurationCategories } from "@shared/schema";
import { VideoGrid } from "@/components/video-grid";
import { VideoFilters } from "@/components/video-filters";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Home() {
  const [filters, setFilters] = useState({
    platform: null as string | null,
    duration: null as string | null,
    tag: null as string | null,
  });

  const { data: videos, isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const handleFilterChange = (key: string, value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredVideos = videos?.filter(video => {
    if (filters.platform && video.platform !== filters.platform) return false;

    if (filters.duration) {
      const duration = video.duration;
      const category = filters.duration;
      if (category === "short" && duration > videoDurationCategories.short.max) return false;
      if (category === "medium" && (duration <= videoDurationCategories.medium.min || duration > videoDurationCategories.medium.max)) return false;
      if (category === "long" && duration <= videoDurationCategories.long.min) return false;
    }

    if (filters.tag && !video.tags.includes(filters.tag)) return false;

    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="py-4 px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  {[1, 2, 3].map(j => (
                    <Skeleton key={j} className="h-8 w-20" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          AI Video Resources
        </h1>
        {videos && (
          <VideoFilters
            videos={videos}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
        )}
      </div>
      {filteredVideos && <VideoGrid videos={filteredVideos} />}
    </div>
  );
}