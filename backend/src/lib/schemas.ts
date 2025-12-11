import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
});

// Folder schemas
export const createFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  roomType: z.string().max(50).optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  roomType: z.string().max(50).optional(),
});

export const reorderFoldersSchema = z.object({
  folderIds: z.array(z.string()).min(1, 'At least one folder ID required'),
});

// Photo schemas
export const bulkDeletePhotosSchema = z.object({
  photoIds: z.array(z.string()).min(1, 'At least one photo ID required'),
});

// Analysis schemas
export const triggerAnalysisSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type ReorderFoldersInput = z.infer<typeof reorderFoldersSchema>;
export type BulkDeletePhotosInput = z.infer<typeof bulkDeletePhotosSchema>;
export type TriggerAnalysisInput = z.infer<typeof triggerAnalysisSchema>;
