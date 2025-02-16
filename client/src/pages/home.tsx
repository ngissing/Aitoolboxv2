import { useQuery } from "@tanstack/react-query";
import { Video, videoDurationCategories } from "@shared/schema";
import { VideoGrid } from "@/components/video-grid";
import { VideoFilters } from "@/components/video-filters";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

async function fetchVideos(): Promise<Video[]> {
  const response = await fetch("/api/videos");
  if (!response.ok) {
    const errorText = await response.text();
    let errorData = {
      message: "Failed to fetch videos",
      error: null as string | null,
      stack: null as string | null,
      environment: null as string | null,
      initialized: false,
      supabaseUrl: null as string | null,
      hasAnonKey: false,
      hasServiceKey: false
    };

    try {
      const parsed = JSON.parse(errorText);
      errorData = { ...errorData, ...parsed };
      
      // Log detailed error information
      console.error("Server Error Details:", {
        message: errorData.message,
        error: errorData.error,
        stack: errorData.stack,
        environment: errorData.environment,
        initialized: errorData.initialized,
        supabaseUrl: errorData.supabaseUrl,
        hasAnonKey: errorData.hasAnonKey,
        hasServiceKey: errorData.hasServiceKey
      });
    } catch {
      // If we can't parse the error as JSON, use the raw text
      errorData.message = errorText;
    }

    throw new Error(JSON.stringify(errorData));
  }
  return response.json();
}

export default function Home() {
  const [filters, setFilters] = useState({
    platform: null as string | null,
    duration: null as string | null,
    tags: [] as string[],
    search: "" as string
  });

  const { data: videos, isLoading, error } = useQuery<Video[], Error>({
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
        video.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm));

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

  if (error) {
    let errorDetails = {
      message: error.message,
      environment: null,
      initialized: false,
      hasAnonKey: false,
      hasServiceKey: false
    };

    try {
      errorDetails = { ...errorDetails, ...JSON.parse(error.message) };
    } catch {
      // If parsing fails, use the error message as is
    }

    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Videos</AlertTitle>
        <AlertDescription>
          <div className="mt-2">
            <p>{errorDetails.message}</p>
            {errorDetails.environment && (
              <div className="mt-4 text-sm opacity-80">
                <p>Environment: {errorDetails.environment}</p>
                <p>Database Initialized: {errorDetails.initialized ? "Yes" : "No"}</p>
                <p>Database Configuration:</p>
                <ul className="list-disc list-inside ml-4">
                  <li>Anon Key: {errorDetails.hasAnonKey ? "Available" : "Missing"}</li>
                  <li>Service Key: {errorDetails.hasServiceKey ? "Available" : "Missing"}</li>
                </ul>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

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