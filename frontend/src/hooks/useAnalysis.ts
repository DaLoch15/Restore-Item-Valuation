import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  triggerAnalysis,
  fetchAnalysisJob,
  fetchProjectAnalysisJobs,
  isJobRunning,
  type TriggerAnalysisResponse,
  type AnalysisJob,
} from '@/api/analysis';

// Query keys
export const analysisKeys = {
  all: ['analysis'] as const,
  jobs: () => [...analysisKeys.all, 'jobs'] as const,
  job: (jobId: string) => [...analysisKeys.jobs(), jobId] as const,
  projectJobs: (projectId: string) => [...analysisKeys.all, 'project', projectId] as const,
};

/**
 * Hook to trigger analysis for a project
 */
export function useTriggerAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => triggerAnalysis(projectId),
    onSuccess: (data: TriggerAnalysisResponse) => {
      // Invalidate project jobs list
      queryClient.invalidateQueries({ queryKey: analysisKeys.all });
      // Start polling for this job
      queryClient.setQueryData(analysisKeys.job(data.jobId), {
        id: data.jobId,
        status: data.status,
      });
    },
  });
}

/**
 * Hook to fetch a single analysis job with optional polling
 */
export function useAnalysisJob(
  jobId: string | null | undefined,
  options?: {
    polling?: boolean;
    pollingInterval?: number;
    onComplete?: (job: AnalysisJob) => void;
  }
) {
  const { polling = false, pollingInterval = 3000, onComplete } = options || {};

  return useQuery({
    queryKey: analysisKeys.job(jobId!),
    queryFn: () => fetchAnalysisJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      if (!polling) return false;
      const job = query.state.data as AnalysisJob | undefined;
      // Stop polling when job is complete
      if (job && !isJobRunning(job)) {
        if (onComplete) {
          onComplete(job);
        }
        return false;
      }
      return pollingInterval;
    },
  });
}

/**
 * Hook to fetch all analysis jobs for a project
 */
export function useProjectAnalysisJobs(projectId: string | undefined) {
  return useQuery({
    queryKey: analysisKeys.projectJobs(projectId!),
    queryFn: () => fetchProjectAnalysisJobs(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Hook to get the latest running or most recent job for a project
 */
export function useLatestProjectJob(projectId: string | undefined) {
  const { data: jobs, ...rest } = useProjectAnalysisJobs(projectId);

  const latestJob = jobs?.[0] || null;
  const runningJob = jobs?.find(isJobRunning) || null;

  return {
    ...rest,
    data: runningJob || latestJob,
    isRunning: !!runningJob,
    latestJob,
    runningJob,
    jobs,
  };
}
