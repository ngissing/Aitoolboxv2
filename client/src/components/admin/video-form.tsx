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
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import ReactPlayer from "react-player";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";

interface VideoFormProps {
  onSubmit: (data: InsertVideo) => void;
  defaultValues?: Video;
  submitLabel?: string;
}

// Directly use the insertVideoSchema and add additional validation
const formSchema = insertVideoSchema.superRefine((data, ctx) => {
  if (data.url && !ReactPlayer.canPlay(data.url)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Must be a valid YouTube, Vimeo, or MP4 URL",
      path: ["url"],
    });
  }

  if (data.thumbnail && !data.thumbnail.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Must be a valid image URL (JPG, PNG, or WebP)",
      path: ["thumbnail"],
    });
  }
});

export function VideoForm({ onSubmit, defaultValues, submitLabel = "Add Video" }: VideoFormProps) {
  const [previewUrl, setPreviewUrl] = useState(defaultValues?.url || "");
  const [uploadType, setUploadType] = useState<"url" | "file">("url");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<InsertVideo>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      title: "",
      description: "",
      url: null,
      videoData: null,
      thumbnail: "",
      platform: "youtube",
      duration: 0,
      transcript: "",
      tags: [],
    },
  });

  const handleUrlChange = (url: string) => {
    form.setValue("url", url || null);
    form.setValue("videoData", null); // Clear any uploaded file data
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Create a chunk size of 2MB
    const CHUNK_SIZE = 2 * 1024 * 1024;
    const chunks = Math.ceil(file.size / CHUNK_SIZE);
    let processedChunks = 0;

    // Read file as base64 in chunks
    const reader = new FileReader();
    let base64Data = '';

    const readNextChunk = (start: number) => {
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      reader.readAsDataURL(chunk);
    };

    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (processedChunks === 0) {
        // For first chunk, keep the data URL prefix
        base64Data = result;
      } else {
        // For subsequent chunks, only append the base64 data
        base64Data += result.split('base64,')[1];
      }

      processedChunks++;
      const progress = (processedChunks / chunks) * 100;
      setUploadProgress(progress);

      if (processedChunks < chunks) {
        // Read next chunk
        readNextChunk(processedChunks * CHUNK_SIZE);
      } else {
        // All chunks processed
        form.setValue("videoData", {
          data: base64Data.split(",")[1], // Remove data URL prefix
          filename: file.name
        });
        form.setValue("url", null); // Clear any existing URL
        form.setValue("platform", "upload");

        // Create object URL for preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setIsUploading(false);
      }
    };

    // Start reading the first chunk
    readNextChunk(0);
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

            <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as "url" | "file")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">Video URL</TabsTrigger>
                <TabsTrigger value="file">Upload File</TabsTrigger>
              </TabsList>
              <TabsContent value="url">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          type="url" 
                          onChange={e => handleUrlChange(e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter a YouTube, Vimeo, or direct MP4 video URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              <TabsContent value="file">
                <FormItem>
                  <FormLabel>Video File</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <Input 
                        type="file" 
                        accept="video/*"
                        onChange={handleFileChange}
                        disabled={isUploading}
                      />
                      {isUploading && (
                        <div className="space-y-2">
                          <Progress value={uploadProgress} />
                          <p className="text-sm text-muted-foreground">
                            Uploading... {Math.round(uploadProgress)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload a video file from your computer
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              </TabsContent>
            </Tabs>

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
                      <SelectItem value="upload">Upload</SelectItem>
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

        <Button type="submit" className="w-full" disabled={isUploading}>
          {isUploading ? "Uploading..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}