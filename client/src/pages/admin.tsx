import { useQuery, useMutation, UseQueryOptions } from "@tanstack/react-query";
import { VideoForm } from "@/components/admin/video-form";
import { type Video, type InsertVideo } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Admin() {
  const { toast } = useToast();
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [deleteVideoId, setDeleteVideoId] = useState<number | null>(null);

  const queryOptions: UseQueryOptions<Video[], Error> = {
    queryKey: ["/api/videos"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/videos");
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format");
      }
      return data as Video[];
    }
  };

  const { data: videos, isLoading, error, refetch } = useQuery<Video[], Error>(queryOptions);

  // Handle error in useEffect instead of during render
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch videos",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const createMutation = useMutation({
    mutationFn: async (video: InsertVideo) => {
      // Ensure video data is in the correct format
      const formattedVideo: InsertVideo = {
        ...video,
        video_data: video.video_data || null,
        url: video.url || null,
      };
      
      console.log("Submitting video:", formattedVideo);
      const res = await apiRequest("POST", "/api/videos", formattedVideo);
      const data = await res.json();
      console.log("Response:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Success",
        description: "Video created successfully",
      });
    },
    onError: (error) => {
      console.error("Failed to create video:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create video",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, video }: { id: number; video: InsertVideo }) => {
      console.log('Updating video:', id, video);
      const res = await apiRequest("PATCH", `/api/videos/${id}`, video);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update video');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setEditVideo(null);
      toast({
        title: "Success",
        description: "Video updated successfully",
      });
    },
    onError: (error) => {
      console.error("Failed to update video:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update video",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/videos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setDeleteVideoId(null);
      toast({
        title: "Success",
        description: "Video deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Failed to delete video:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete video",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-8">Admin Panel</h1>
        <VideoForm onSubmit={(data) => createMutation.mutate(data)} />
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Existing Videos</h2>
          {error && (
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 border rounded bg-destructive/10 text-destructive">
            {error.message || "Failed to load videos"}
          </div>
        ) : !videos || videos.length === 0 ? (
          <div className="p-4 border rounded text-muted-foreground">
            No videos found. Add your first video using the form above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video: Video) => (
                <TableRow key={video.id}>
                  <TableCell className="font-medium">{video.title}</TableCell>
                  <TableCell>{video.platform}</TableCell>
                  <TableCell>{video.duration}s</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditVideo(video)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteVideoId(video.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!editVideo} onOpenChange={(open) => !open && setEditVideo(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>
          {editVideo && (
            <VideoForm
              defaultValues={{
                ...editVideo,
                video_data: null, // Reset video_data when editing
                video_date: editVideo.video_date ? new Date(editVideo.video_date) : null
              }}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editVideo.id, video: data })
              }
              submitLabel="Update Video"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteVideoId}
        onOpenChange={() => setDeleteVideoId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the video.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVideoId && deleteMutation.mutate(deleteVideoId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
