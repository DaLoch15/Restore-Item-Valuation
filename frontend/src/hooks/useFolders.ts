import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
  type CreateFolderInput,
  type UpdateFolderInput,
} from '@/api/folders';
import { projectKeys } from './useProjects';

// Query keys
export const folderKeys = {
  all: ['folders'] as const,
  lists: () => [...folderKeys.all, 'list'] as const,
  list: (projectId: string) => [...folderKeys.lists(), projectId] as const,
};

// Fetch folders for a project
export function useFolders(projectId: string | undefined) {
  return useQuery({
    queryKey: folderKeys.list(projectId!),
    queryFn: () => fetchFolders(projectId!),
    enabled: !!projectId,
  });
}

// Create folder mutation
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string;
      input: CreateFolderInput;
    }) => createFolder(projectId, input),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Update folder mutation
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      folderId,
      input,
    }: {
      projectId: string;
      folderId: string;
      input: UpdateFolderInput;
    }) => updateFolder(projectId, folderId, input),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

// Delete folder mutation
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      folderId,
    }: {
      projectId: string;
      folderId: string;
    }) => deleteFolder(projectId, folderId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Reorder folders mutation
export function useReorderFolders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      folderIds,
    }: {
      projectId: string;
      folderIds: string[];
    }) => reorderFolders(projectId, folderIds),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.list(projectId) });
    },
  });
}
