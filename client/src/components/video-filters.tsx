import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Video } from "@shared/schema";
import { Search } from "lucide-react";

interface VideoFiltersProps {
  videos: Video[];
  filters: {
    platform: string | null;
    duration: string | null;
    tag: string | null;
    search: string;
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
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,200px,200px,200px] gap-4 items-end">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos..."
              className="pl-8"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
            />
          </div>

          <div>
            <Select
              value={filters.platform ?? "all"}
              onValueChange={(value) => onFilterChange('platform', value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {platforms.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
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

          <div>
            <Select
              value={filters.tag ?? "all"}
              onValueChange={(value) => onFilterChange('tag', value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}