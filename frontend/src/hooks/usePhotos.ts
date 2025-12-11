import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  fetchPhotos,
  uploadPhotos,
  deletePhoto,
  bulkDeletePhotos,
} from '@/api/photos';
import { folderKeys } from './useFolders';
import { projectKeys } from './useProjects';

// Query keys
export const photoKeys = {
  all: ['photos'] as const,
  lists: () => [...photoKeys.all, 'list'] as const,
  list: (folderId: string) => [...photoKeys.lists(), folderId] as const,
};

// Fetch photos for a folder
export function usePhotos(folderId: string | undefined) {
  return useQuery({
    queryKey: photoKeys.list(folderId!),
    queryFn: () => fetchPhotos(folderId!),
    enabled: !!folderId,
  });
}

// Upload photos mutation with progress tracking
export function useUploadPhotos() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: ({ folderId, files }: { folderId: string; files: File[] }) =>
      uploadPhotos(folderId, files, setProgress),
    onSuccess: (_, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.list(folderId) });
      // Also invalidate folder queries to update photo counts
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      setProgress(0);
    },
    onError: () => {
      setProgress(0);
    },
  });

  const reset = useCallback(() => {
    setProgress(0);
  }, []);

  return {
    ...mutation,
    progress,
    reset,
  };
}

// Delete single photo mutation
export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId, photoId }: { folderId: string; photoId: string }) =>
      deletePhoto(folderId, photoId),
    onSuccess: (_, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.list(folderId) });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Bulk delete photos mutation
export function useBulkDeletePhotos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      folderId,
      photoIds,
    }: {
      folderId: string;
      photoIds: string[];
    }) => bulkDeletePhotos(folderId, photoIds),
    onSuccess: (_, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.list(folderId) });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
