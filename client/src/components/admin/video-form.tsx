import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVideoSchema, type InsertVideo, type Video } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import ReactPlayer from "react-player";

interface VideoFormProps {
  onSubmit: (data: InsertVideo) => void;
  defaultValues?: Video;
  submitLabel?: string;
}

const extendedVideoSchema = insertVideoSchema.extend({
  url: insertVideoSchema.shape.url.refine(
    (url) => ReactPlayer.canPlay(url),
    { message: "Must be a valid YouTube, Vimeo, or MP4 URL" }
  ),
  thumbnail: insertVideoSchema.shape.thumbnail.refine(
    (url) => url.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i),
    { message: "Must be a valid image URL (JPG, PNG, or WebP)" }
  ),
});

export function VideoForm({ onSubmit, defaultValues, submitLabel = "Add Video" }: VideoFormProps) {
  const [previewUrl, setPreviewUrl] = useState(defaultValues?.url || "");

  const form = useForm<InsertVideo>({
    resolver: zodResolver(extendedVideoSchema),
    defaultValues: defaultValues || {
      title: "",
      description: "",
      url: "",
      thumbnail: "",
      platform: "youtube",
      duration: 0,
      transcript: "",
      tags: [],
    },
  });

  const handleUrlChange = (url: string) => {
    form.setValue("url", url);
    setPreviewUrl(url);

    if (ReactPlayer.canPlay(url)) {
      // Auto-detect platform
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        form.setValue("platform", "youtube");
      } else if (url.includes("vimeo.com")) {
        form.setValue("platform", "vimeo");
      } else {
        form.setValue("platform", "mp4");
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video URL</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" onChange={e => handleUrlChange(e.target.value)} />
                  </FormControl>
                  <FormDescription>
                    Enter a YouTube, Vimeo, or direct MP4 video URL
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thumbnail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thumbnail URL</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" />
                  </FormControl>
                  <FormDescription>
                    Enter a URL for the video thumbnail (JPG, PNG, or WebP)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="mp4">MP4</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (seconds)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} />
                  </FormControl>
                  <FormDescription>
                    Enter the video duration in seconds (e.g., 300 for 5 minutes)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value.join(", ")}
                      onChange={e => field.onChange(e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter tags separated by commas (e.g., chatgpt, education, ai)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            {previewUrl && (
              <Card className="p-4">
                <h3 className="font-medium mb-2">Video Preview</h3>
                <div className="aspect-video">
                  <ReactPlayer
                    url={previewUrl}
                    width="100%"
                    height="100%"
                    controls
                  />
                </div>
              </Card>
            )}

            <FormField
              control={form.control}
              name="transcript"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transcript</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={previewUrl ? 12 : 20} />
                  </FormControl>
                  <FormDescription>
                    Enter the video transcript or description
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" className="w-full">{submitLabel}</Button>
      </form>
    </Form>
  );
}