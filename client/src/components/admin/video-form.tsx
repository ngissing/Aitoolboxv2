import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type InsertVideo, type Video } from "@shared/schema";
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
import { useState, Component, lazy, Suspense } from "react";
import ReactPlayerStatic from "react-player";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Lazy load ReactPlayer for rendering
const ReactPlayer = lazy(() => import('react-player/lazy'));

// Error boundary for video preview
class VideoPreviewErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Video preview error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full aspect-video bg-muted flex items-center justify-center text-muted-foreground">
          Video preview unavailable
        </div>
      );
    }

    return this.props.children;
  }
}

export type VideoFormProps = {
  onSubmit: (data: InsertVideo) => void;
  defaultValues?: Partial<InsertVideo>;
  submitLabel?: string;
};

// Directly use the insertVideoSchema and add additional validation
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  url: z.string().nullable(),
  videoData: z.object({
    data: z.string(),
    filename: z.string()
  }).nullable(),
  thumbnail: z.string().min(1, "Thumbnail URL is required"),
  platform: z.enum(["youtube", "vimeo", "mp4", "upload"]),
  duration: z.number().min(0),
  transcript: z.string().min(1, "Transcript is required"),
  tags: z.array(z.string()),
  videoDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date(),
    z.null()
  ])
}).superRefine((data, ctx) => {
  if (data.url && !ReactPlayerStatic.canPlay(data.url)) {
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

type VideoFormData = z.infer<typeof formSchema>;

export function VideoForm({ onSubmit, defaultValues, submitLabel = "Add Video" }: VideoFormProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState(defaultValues?.url || "");
  const [uploadType, setUploadType] = useState<"url" | "file">("url");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      url: defaultValues?.url || null,
      videoData: defaultValues?.videoData || null,
      thumbnail: defaultValues?.thumbnail || "https://placehold.co/600x400",
      platform: (defaultValues?.platform || "youtube") as "youtube" | "vimeo" | "mp4" | "upload",
      duration: defaultValues?.duration || 300,
      transcript: defaultValues?.transcript || "Transcript will be added later",
      tags: defaultValues?.tags || [],
      videoDate: defaultValues?.videoDate || null,
    },
  });

  const handleUrlChange = (url: string) => {
    form.setValue("url", url || null);
    form.setValue("videoData", null); // Clear any uploaded file data
    setPreviewUrl(url);

    if (ReactPlayerStatic.canPlay(url)) {
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

  const handleSubmit = async (data: VideoFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      toast({
        title: "Success",
        description: "Video added successfully",
      });
      form.reset(); // Reset form after successful submission
      setPreviewUrl("");
      setUploadProgress(0);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add video",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="vimeo">Vimeo</SelectItem>
                      <SelectItem value="mp4">MP4</SelectItem>
                      <SelectItem value="upload">Upload</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the video platform
                  </FormDescription>
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

            <FormField
              control={form.control}
              name="videoDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Video Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date: Date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select the date associated with this video
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
                  <VideoPreviewErrorBoundary>
                    <Suspense fallback={
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground">Loading preview...</p>
                      </div>
                    }>
                      <ReactPlayer
                        url={previewUrl}
                        width="100%"
                        height="100%"
                        controls
                        playing={false}
                        onError={(e: any) => {
                          console.error('Video preview error:', e);
                          toast({
                            title: "Preview Error",
                            description: "Could not load video preview. This doesn't affect the video data.",
                            variant: "default"
                          });
                        }}
                        config={{
                          youtube: {
                            playerVars: { 
                              origin: window.location.origin,
                              enablejsapi: 1,
                              modestbranding: 1,
                              rel: 0,
                              host: window.location.origin
                            }
                          },
                          file: {
                            forceVideo: true,
                            attributes: {
                              controlsList: 'nodownload'
                            }
                          }
                        }}
                      />
                    </Suspense>
                  </VideoPreviewErrorBoundary>
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
                    <Textarea 
                      {...field} 
                      rows={previewUrl ? 12 : 20}
                      className="font-mono text-sm"
                      placeholder="Enter the video transcript here. Use blank lines to create paragraph breaks."
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the video transcript. Use blank lines to separate paragraphs for better readability.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isUploading || isSubmitting}
        >
          {isUploading ? "Uploading..." : isSubmitting ? "Adding Video..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}

export function VideoFormDialog({ editVideo, updateMutation }: { editVideo: Video | null, updateMutation: any }) {
  return (
    <Dialog>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
        </DialogHeader>
        {editVideo && (
          <VideoForm
            defaultValues={{
              ...editVideo,
              videoData: null // Reset videoData when editing
            }}
            onSubmit={(data) =>
              updateMutation.mutate({ id: editVideo.id, video: data })
            }
            submitLabel="Update Video"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}