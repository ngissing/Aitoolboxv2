import { useQuery } from "@tanstack/react-query";
import { Video, videoDurationCategories } from "@shared/schema";
import { VideoGrid } from "@/components/video-grid";
import { VideoFilters } from "@/components/video-filters";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

async function fetchVideos(): Promise<Video[]> {
  const response = await fetch("/api/videos");
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "Failed to fetch videos";
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorMessage;
      if (errorData.stack) {
        console.error("Server error stack:", errorData.stack);
      }
    } catch {
      // If we can't parse the error as JSON, use the raw text
      errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export default function Home() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    platform: null as string | null,
    duration: null as string | null,
    tags: [] as string[],
    search: "" as string
  });

  const { data: videos, isLoading } = useQuery<Video[]>({
    queryKey: ["videos"],
    queryFn: fetchVideos,
    retry: false
  });

  const handleFilterChange = (key: string, value: string | string[] | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredVideos = videos?.filter((video: Video) => {
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
  }) || [];

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
      {videos && (
        <VideoFilters
          videos={videos}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      )}
      {filteredVideos && <VideoGrid videos={filteredVideos} />}
    </div>
  );
}