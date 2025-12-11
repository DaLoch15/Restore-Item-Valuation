import { apiClient } from './client';

// Types
export interface Folder {
  id: string;
  name: string;
  roomType: string | null;
  displayOrder: number;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderInput {
  name: string;
  roomType?: string;
}

export interface UpdateFolderInput {
  name?: string;
  roomType?: string;
}

// API functions
export async function fetchFolders(projectId: string): Promise<Folder[]> {
  const response = await apiClient.get<{ folders: Folder[] }>(
    `/projects/${projectId}/folders`
  );
  return response.data.folders;
}

export async function createFolder(
  projectId: string,
  input: CreateFolderInput
): Promise<Folder> {
  const response = await apiClient.post<{ folder: Folder }>(
    `/projects/${projectId}/folders`,
    input
  );
  return response.data.folder;
}

export async function updateFolder(
  projectId: string,
  folderId: string,
  input: UpdateFolderInput
): Promise<Folder> {
  const response = await apiClient.patch<{ folder: Folder }>(
    `/projects/${projectId}/folders/${folderId}`,
    input
  );
  return response.data.folder;
}

export async function deleteFolder(
  projectId: string,
  folderId: string
): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/folders/${folderId}`);
}

export async function reorderFolders(
  projectId: string,
  folderIds: string[]
): Promise<Folder[]> {
  const response = await apiClient.patch<{ folders: Folder[] }>(
    `/projects/${projectId}/folders/reorder`,
    { folderIds }
  );
  return response.data.folders;
}
