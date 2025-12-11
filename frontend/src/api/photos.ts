import { apiClient } from './client';

// Types
export interface Photo {
  id: string;
  fileName: string;
  originalName: string;
  storageUrl: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileSize: number;
  status: 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';
  createdAt: string;
}

export interface UploadResult {
  photos: Photo[];
  errors?: { file: string; error: string }[];
  uploadedCount: number;
  failedCount: number;
}

// API functions
export async function fetchPhotos(folderId: string): Promise<Photo[]> {
  const response = await apiClient.get<{ photos: Photo[] }>(
    `/folders/${folderId}/photos`
  );
  return response.data.photos;
}

export async function uploadPhotos(
  folderId: string,
  files: File[],
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('photos', file);
  });

  const response = await apiClient.post<UploadResult>(
    `/folders/${folderId}/photos/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    }
  );

  return response.data;
}

export async function deletePhoto(
  folderId: string,
  photoId: string
): Promise<void> {
  await apiClient.delete(`/folders/${folderId}/photos/${photoId}`);
}

export async function bulkDeletePhotos(
  folderId: string,
  photoIds: string[]
): Promise<{ deletedCount: number }> {
  const response = await apiClient.delete<{ deletedCount: number }>(
    `/folders/${folderId}/photos/bulk`,
    { data: { photoIds } }
  );
  return response.data;
}
