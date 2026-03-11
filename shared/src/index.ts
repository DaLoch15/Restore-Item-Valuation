// === ENUMS ===
export type ProjectStatus = 'DRAFT' | 'READY' | 'PROCESSING' | 'COMPLETED' | 'ARCHIVED';
export type PhotoStatus = 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';
export type AnalysisStatus = 'PENDING' | 'TRIGGERED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// === ENTITIES ===
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  // Computed
  folderCount?: number;
  photoCount?: number;
  latestJob?: AnalysisJob | null;
}

export interface Folder {
  id: string;
  projectId: string;
  name: string;
  roomType: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  // Computed
  photoCount?: number;
}

export interface Photo {
  id: string;
  folderId: string;
  fileName: string;
  originalName: string;
  storagePath: string;
  storageUrl: string;
  mimeType: string;
  fileSize: number;
  thumbnailUrl: string | null;
  status: PhotoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisJob {
  id: string;
  projectId: string;
  status: AnalysisStatus;
  triggeredAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  resultsSummary: AnalysisResults | null;
  sheetUrl: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisResults {
  totalPhotosProcessed: number;
  totalItemsIdentified: number;
  totalRCV: number;
  totalACV: number;
  processingTimeMs: number;
}

// === API REQUESTS ===
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface CreateFolderRequest {
  name: string;
  roomType?: string;
}

export interface UpdateFolderRequest {
  name?: string;
  roomType?: string;
}

export interface ReorderFoldersRequest {
  folderIds: string[];
}

export interface TriggerAnalysisRequest {
  projectId: string;
}

export interface BulkDeletePhotosRequest {
  photoIds: string[];
}

// === API RESPONSES ===
export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface TriggerAnalysisResponse {
  success: boolean;
  jobId: string;
  status: AnalysisStatus;
  message: string;
  estimatedDuration: number;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// === n8n WEBHOOK PAYLOADS ===
export interface N8nTriggerPayload {
  projectId: string;
  projectName: string;
  analysisJobId: string;
  callbackUrl: string;
  callbackSecret: string;
  folders: N8nFolderPayload[];
  outputSheetId: string;
}

export interface N8nFolderPayload {
  folderId: string;
  folderName: string;
  roomType: string;
  photos: N8nPhotoPayload[];
}

export interface N8nPhotoPayload {
  photoId: string;
  fileName: string;
  downloadUrl: string;
  mimeType: string;
}

export interface N8nCallbackPayload {
  success: boolean;
  analysisJobId: string;
  projectId: string;
  results?: AnalysisResults & { sheetUrl: string };
  error?: string;
  signature: string;
}

// === ROOM TYPES ===
export const ROOM_TYPES = [
  { value: 'living_room', label: 'Living Room', icon: '🛋️' },
  { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { value: 'dining_room', label: 'Dining Room', icon: '🍽️' },
  { value: 'bedroom', label: 'Bedroom', icon: '🛏️' },
  { value: 'bathroom', label: 'Bathroom', icon: '🚿' },
  { value: 'office', label: 'Home Office', icon: '💼' },
  { value: 'garage', label: 'Garage', icon: '🚗' },
  { value: 'basement', label: 'Basement', icon: '🏠' },
  { value: 'attic', label: 'Attic', icon: '🏠' },
  { value: 'laundry', label: 'Laundry Room', icon: '🧺' },
  { value: 'closet', label: 'Closet', icon: '👕' },
  { value: 'outdoor', label: 'Outdoor/Patio', icon: '🌳' },
  { value: 'other', label: 'Other', icon: '📦' },
] as const;

export type RoomType = typeof ROOM_TYPES[number]['value'];
