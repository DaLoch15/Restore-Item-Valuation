import { apiClient } from './client';

// Types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'READY' | 'PROCESSING' | 'COMPLETED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  folderCount: number;
  photoCount: number;
  latestAnalysis: {
    id: string;
    status: 'PENDING' | 'TRIGGERED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    completedAt: string | null;
    resultsSummary: Record<string, unknown> | null;
    sheetUrl: string | null;
    pdfUrl: string | null;
  } | null;
}

export interface ProjectWithFolders extends Omit<Project, 'folderCount' | 'photoCount'> {
  folders: {
    id: string;
    name: string;
    roomType: string | null;
    displayOrder: number;
    photoCount: number;
    createdAt: string;
    updatedAt: string;
  }[];
  latestAnalysis: {
    id: string;
    status: 'PENDING' | 'TRIGGERED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    triggeredAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    errorMessage: string | null;
    resultsSummary: Record<string, unknown> | null;
    sheetUrl: string | null;
    pdfUrl: string | null;
  } | null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

// API functions
export async function fetchProjects(): Promise<Project[]> {
  const response = await apiClient.get<{ projects: Project[] }>('/projects');
  return response.data.projects;
}

export async function fetchProject(id: string): Promise<ProjectWithFolders> {
  const response = await apiClient.get<{ project: ProjectWithFolders }>(
    `/projects/${id}`
  );
  return response.data.project;
}

export async function createProject(
  input: CreateProjectInput
): Promise<Project> {
  const response = await apiClient.post<{ project: Project }>(
    '/projects',
    input
  );
  return response.data.project;
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput
): Promise<Project> {
  const response = await apiClient.patch<{ project: Project }>(
    `/projects/${id}`,
    input
  );
  return response.data.project;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}
