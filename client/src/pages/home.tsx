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
    tags: [] as string[],
    search: "" as string
  });

  const { data: videos, isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredVideos = videos?.filter(video => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = 
        video.title.toLowerCase().includes(searchTerm) ||
        video.description.toLowerCase().includes(searchTerm) ||
        video.tags.some(tag => tag.toLowerCase().includes(searchTerm));

      if (!matchesSearch) return false;
    }

    // Platform filter - case-insensitive partial match
    if (filters.platform) {
      const platformMatch = video.platform.toLowerCase().includes(filters.platform.toLowerCase());
      if (!platformMatch) return false;
    }

    // Duration filter
    if (filters.duration) {
      const duration = video.duration;
      const category = filters.duration;
      if (category === "short" && duration > videoDurationCategories.short.max) return false;
      if (category === "medium" && (duration <= videoDurationCategories.medium.min || duration > videoDurationCategories.medium.max)) return false;
      if (category === "long" && duration <= videoDurationCategories.long.min) return false;
    }

    // Multi-tag filter - video must have ALL selected tags
    if (filters.tags.length > 0) {
      const hasAllTags = filters.tags.every(tag => video.tags.includes(tag));
      if (!hasAllTags) return false;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="py-4 px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
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