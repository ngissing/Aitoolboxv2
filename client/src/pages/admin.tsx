import { useQuery, useMutation } from "@tanstack/react-query";
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
import { useState } from "react";
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

  const { data: videos } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const createMutation = useMutation({
    mutationFn: async (video: InsertVideo) => {
      const res = await apiRequest("POST", "/api/videos", video);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Success",
        description: "Video added successfully",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, video }: { id: number; video: InsertVideo }) => {
      const res = await apiRequest("PATCH", `/api/videos/${id}`, video);
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
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-8">Admin Panel</h1>
        <VideoForm onSubmit={(data) => createMutation.mutate(data)} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Existing Videos</h2>
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
            {videos?.map((video) => (
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
      </div>

      <Dialog open={!!editVideo} onOpenChange={() => setEditVideo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>
          {editVideo && (
            <VideoForm
              defaultValues={editVideo}
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
