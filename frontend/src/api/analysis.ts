import { apiClient } from './client';

// Types
export type AnalysisStatus = 'PENDING' | 'TRIGGERED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AnalysisResults {
  totalPhotosProcessed: number;
  totalItemsIdentified: number;
  totalRCV: number;
  totalACV: number;
  processingTimeMs: number;
  sheetUrl?: string;
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

export interface TriggerAnalysisResponse {
  success: boolean;
  jobId: string;
  status: AnalysisStatus;
  message: string;
  estimatedDuration: number;
}

// API Functions

/**
 * Trigger analysis for a project
 */
export async function triggerAnalysis(projectId: string): Promise<TriggerAnalysisResponse> {
  const response = await apiClient.post<TriggerAnalysisResponse>('/analysis/trigger', {
    projectId,
  });
  return response.data;
}

/**
 * Get analysis job by ID
 */
export async function fetchAnalysisJob(jobId: string): Promise<AnalysisJob> {
  const response = await apiClient.get<AnalysisJob>(`/analysis/${jobId}`);
  return response.data;
}

/**
 * Get all analysis jobs for a project
 */
export async function fetchProjectAnalysisJobs(projectId: string): Promise<AnalysisJob[]> {
  const response = await apiClient.get<AnalysisJob[]>(`/analysis/project/${projectId}`);
  return response.data;
}

/**
 * Check if a job is still running
 */
export function isJobRunning(job: AnalysisJob | null | undefined): boolean {
  if (!job) return false;
  return ['PENDING', 'TRIGGERED', 'PROCESSING'].includes(job.status);
}

/**
 * Check if a job is complete (success or failure)
 */
export function isJobComplete(job: AnalysisJob | null | undefined): boolean {
  if (!job) return false;
  return ['COMPLETED', 'FAILED'].includes(job.status);
}

/**
 * Format processing time for display
 */
export function formatProcessingTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
