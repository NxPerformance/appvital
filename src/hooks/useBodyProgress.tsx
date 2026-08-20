import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./useAuth";

export type BodyProgressPose = "front" | "side" | "back" | "custom";

export interface BodyProgressPhoto {
  id: string;
  user_id: string;
  image_url: string;
  pose: BodyProgressPose;
  label: string | null;
  notes: string | null;
  taken_at: string;
  created_at: string;
}

interface UploadPayload {
  file: File;
  pose: Uppercase<BodyProgressPose>;
  label?: string;
  notes?: string;
  taken_at: string;
}

function normalizePhoto(photo: any): BodyProgressPhoto {
  return {
    id: photo.id,
    user_id: photo.user_id,
    image_url: photo.image_url,
    pose: photo.pose,
    label: photo.label ?? null,
    notes: photo.notes ?? null,
    taken_at: photo.taken_at,
    created_at: photo.created_at,
  };
}

export function useBodyProgress() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<BodyProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!user) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ photos: any[] }>("/body-progress/photos");
      setPhotos(response.photos.map(normalizePhoto));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar fotos de evolução");
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchPhotos();
  }, [fetchPhotos]);

  const uploadPhoto = async ({ file, pose, label, notes, taken_at }: UploadPayload) => {
    if (!user) return { error: "Not authenticated" };

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return { error: "Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF." };
    }

    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      return { error: "Arquivo muito grande. Máximo 8MB." };
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", file);
      formData.append("pose", pose);
      formData.append("taken_at", taken_at);
      if (label) formData.append("label", label);
      if (notes) formData.append("notes", notes);

      const response = await api.post<{ photo: any }>("/body-progress/photos", formData);
      setPhotos((current) => [normalizePhoto(response.photo), ...current]);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao enviar foto" };
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    try {
      await api.delete(`/body-progress/photos/${photoId}`);
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao remover foto" };
    }
  };

  return {
    photos,
    loading,
    uploading,
    error,
    uploadPhoto,
    deletePhoto,
    refetch: fetchPhotos,
  };
}
