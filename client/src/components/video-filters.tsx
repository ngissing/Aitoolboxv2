import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Video } from "@shared/schema";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VideoFiltersProps {
  videos: Video[];
  filters: {
    platform: string | null;
    duration: string | null;
    tags: string[];
    search: string;
  };
  onFilterChange: (key: string, value: any) => void;
}

export function VideoFilters({ videos, filters, onFilterChange }: VideoFiltersProps) {
  // Get all unique tags
  const tags = Array.from(new Set(videos.flatMap((v) => v.tags)));

  // Duration categories
  const durations = ["short", "medium", "long"];

  // Handle tag toggle
  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onFilterChange('tags', newTags);
  };

  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,200px,200px] gap-4 items-end">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos..."
              className="pl-8"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
            />
          </div>

          <Input
            placeholder="Filter by platform"
            value={filters.platform || ''}
            onChange={(e) => onFilterChange('platform', e.target.value || null)}
          />

          <Select
            value={filters.duration ?? "all"}
            onValueChange={(value) => onFilterChange('duration', value === "all" ? null : value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Durations</SelectItem>
              {durations.map((duration) => (
                <SelectItem key={duration} value={duration}>
                  {duration.charAt(0).toUpperCase() + duration.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant={filters.tags?.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
                {filters.tags?.includes(tag) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}