import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { Video, videoDurationCategories } from "@shared/schema";

interface VideoFiltersProps {
  videos: Video[];
  filters: {
    platform: string | null;
    duration: string | null;
    tag: string | null;
  };
  onFilterChange: (key: string, value: string | null) => void;
}

export function VideoFilters({ videos, filters, onFilterChange }: VideoFiltersProps) {
  // Get unique platforms
  const platforms = Array.from(new Set(videos.map((v) => v.platform)));
  
  // Get all unique tags
  const tags = Array.from(new Set(videos.flatMap((v) => v.tags)));
  
  // Duration categories
  const durations = ["short", "medium", "long"];

  return (
    <div className="space-y-6 mb-8">
      <div>
        <h3 className="font-medium mb-2">Platform</h3>
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <Button
              key={platform}
              variant={filters.platform === platform ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange("platform", filters.platform === platform ? null : platform)}
            >
              {platform}
              {filters.platform === platform && <Check className="ml-2 h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Duration</h3>
        <div className="flex flex-wrap gap-2">
          {durations.map((duration) => (
            <Button
              key={duration}
              variant={filters.duration === duration ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange("duration", filters.duration === duration ? null : duration)}
            >
              {duration}
              {filters.duration === duration && <Check className="ml-2 h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Tags</h3>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant={filters.tag === tag ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onFilterChange("tag", filters.tag === tag ? null : tag)}
            >
              {tag}
              {filters.tag === tag && <X className="ml-2 h-3 w-3" />}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
