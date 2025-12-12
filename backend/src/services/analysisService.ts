import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { config } from '../lib/config';
import {
  NotFoundError,
  ForbiddenError,
  AnalysisNoPhotosError,
  AnalysisAlreadyRunningError,
  N8nTriggerFailedError,
} from '../lib/errors';
import type { AnalysisJob, Project, Folder, Photo, AnalysisStatus } from '@prisma/client';

// Types for n8n payload
interface N8nPhotoPayload {
  photoId: string;
  fileName: string;
  downloadUrl: string;
  thumbnailUrl: string;
  mimeType: string;
}

interface N8nFolderPayload {
  folderId: string;
  folderName: string;
  roomType: string;
  photos: N8nPhotoPayload[];
}

interface N8nTriggerPayload {
  mode: string;
  projectId: string;
  projectName: string;
  analysisJobId: string;
  callbackUrl: string;
  callbackSecret: string;
  folders: N8nFolderPayload[];
  totalPhotos: number;
  totalFolders: number;
}

interface N8nCallbackPayload {
  success: boolean;
  analysisJobId: string;
  projectId: string;
  results?: {
    totalPhotosProcessed: number;
    totalItemsIdentified: number;
    totalRCV: number;
    totalACV: number;
    processingTimeMs: number;
    sheetUrl: string;
  };
  error?: string;
}

interface TriggerAnalysisResult {
  success: boolean;
  jobId: string;
  status: AnalysisStatus;
  message: string;
  estimatedDuration: number;
}

type ProjectWithFoldersAndPhotos = Project & {
  folders: (Folder & {
    photos: Photo[];
  })[];
};

/**
 * Trigger an analysis job for a project
 */
export async function triggerAnalysis(
  projectId: string,
  userId: string
): Promise<TriggerAnalysisResult> {
  // 1. Validate project exists and belongs to user
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      folders: {
        include: {
          photos: true,
        },
        orderBy: { displayOrder: 'asc' },
      },
    },
  }) as ProjectWithFoldersAndPhotos | null;

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  if (project.userId !== userId) {
    throw new ForbiddenError();
  }

  // 2. Verify project has at least one photo
  const totalPhotos = project.folders.reduce(
    (sum, folder) => sum + folder.photos.length,
    0
  );

  if (totalPhotos === 0) {
    throw new AnalysisNoPhotosError();
  }

  // 3. Check no analysis is already running for this project
  const runningJob = await prisma.analysisJob.findFirst({
    where: {
      projectId,
      status: {
        in: ['PENDING', 'TRIGGERED', 'PROCESSING'],
      },
    },
  });

  if (runningJob) {
    throw new AnalysisAlreadyRunningError();
  }

  // 4. Create AnalysisJob record
  const job = await prisma.analysisJob.create({
    data: {
      projectId,
      status: 'TRIGGERED',
      triggeredAt: new Date(),
    },
  });

  // 5. Build callback URL - use N8N_CALLBACK_BASE_URL if set (ngrok for dev)
  let callbackUrl: string;
  if (config.N8N_CALLBACK_BASE_URL) {
    callbackUrl = `${config.N8N_CALLBACK_BASE_URL}/api/webhooks/n8n/analysis-complete`;
    console.log('[Analysis] Callback URL (ngrok):', callbackUrl);
  } else {
    const backendUrl = config.FRONTEND_URL.replace('localhost:5173', 'localhost:3001');
    callbackUrl = `${backendUrl}/api/webhooks/n8n/analysis-complete`;
    console.log('[Analysis] Warning: No N8N_CALLBACK_BASE_URL set, using:', callbackUrl);
  }

  try {
    const foldersPayload: N8nFolderPayload[] = await Promise.all(
      project.folders
        .filter((folder) => folder.photos.length > 0)
        .map(async (folder) => {
          const photosPayload: N8nPhotoPayload[] = await Promise.all(
            folder.photos.map(async (photo) => {
              // Generate signed URL valid for 1 month (for n8n processing)
              const downloadUrl = await getSignedUrlForAnalysis(photo.storagePath);
              const thumbnailUrl = photo.thumbnailUrl
                ? await getSignedUrlForAnalysis(photo.storagePath.replace('/photos/', '/thumbnails/'))
                : downloadUrl;

              return {
                photoId: photo.id,
                fileName: photo.fileName,
                downloadUrl,
                thumbnailUrl,
                mimeType: photo.mimeType,
              };
            })
          );

          return {
            folderId: folder.id,
            folderName: folder.name,
            roomType: folder.roomType || 'Other',
            photos: photosPayload,
          };
        })
    );

    const payload: N8nTriggerPayload = {
      mode: 'url_based',
      projectId: project.id,
      projectName: project.name,
      analysisJobId: job.id,
      callbackUrl,
      callbackSecret: config.N8N_CALLBACK_SECRET || 'dev-secret',
      folders: foldersPayload,
      totalPhotos,
      totalFolders: foldersPayload.length,
    };

    // 6. POST to N8N_WEBHOOK_URL
    if (config.N8N_WEBHOOK_URL) {
      console.log('[Analysis] Triggering n8n webhook...');
      console.log('[Analysis] URL:', config.N8N_WEBHOOK_URL);
      console.log('[Analysis] Photos:', totalPhotos, 'across', foldersPayload.length, 'folders');

      const response = await fetch(config.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.N8N_WEBHOOK_API_KEY || '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Analysis] n8n error:', response.status, errorText);
        throw new Error(`n8n responded with status ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      console.log('[Analysis] n8n response:', responseText);
    } else {
      // Development mode - simulate n8n trigger
      console.log('[DEV] n8n trigger payload:', JSON.stringify(payload, null, 2));
    }

    // 7. Update project status to PROCESSING
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'PROCESSING' },
    });

    // Calculate estimated duration (10 seconds per photo)
    const estimatedDuration = totalPhotos * 10;

    return {
      success: true,
      jobId: job.id,
      status: job.status,
      message: `Analysis triggered for ${totalPhotos} photos across ${foldersPayload.length} folders`,
      estimatedDuration,
    };
  } catch (error) {
    // Update job to FAILED if trigger fails
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });

    throw new N8nTriggerFailedError(
      error instanceof Error ? error.message : 'Failed to trigger n8n workflow'
    );
  }
}

/**
 * Get analysis job by ID
 */
export async function getAnalysisJob(
  jobId: string,
  userId: string
): Promise<AnalysisJob> {
  const job = await prisma.analysisJob.findUnique({
    where: { id: jobId },
    include: {
      project: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!job) {
    throw new NotFoundError('AnalysisJob', jobId);
  }

  if (job.project.userId !== userId) {
    throw new ForbiddenError();
  }

  // Remove project relation from response
  const { project: _, ...jobData } = job as AnalysisJob & { project: { userId: string } };
  return jobData as AnalysisJob;
}

/**
 * Get all analysis jobs for a project
 */
export async function getProjectAnalysisJobs(
  projectId: string,
  userId: string
): Promise<AnalysisJob[]> {
  // Verify project belongs to user
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  if (project.userId !== userId) {
    throw new ForbiddenError();
  }

  const jobs = await prisma.analysisJob.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  return jobs;
}

/**
 * Process n8n callback
 */
export async function processAnalysisCallback(
  payload: N8nCallbackPayload,
  signature: string
): Promise<{ received: boolean }> {
  // 1. Verify HMAC signature
  const isValid = verifyHmacSignature(payload, signature);
  if (!isValid) {
    throw new ForbiddenError('Invalid webhook signature');
  }

  // 2. Find the analysis job
  const job = await prisma.analysisJob.findUnique({
    where: { id: payload.analysisJobId },
  });

  if (!job) {
    throw new NotFoundError('AnalysisJob', payload.analysisJobId);
  }

  // 3. Update AnalysisJob based on callback result
  if (payload.success && payload.results) {
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        resultsSummary: payload.results,
        sheetUrl: payload.results.sheetUrl,
      },
    });

    // Update project status to COMPLETED
    await prisma.project.update({
      where: { id: payload.projectId },
      data: { status: 'COMPLETED' },
    });
  } else {
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: payload.error || 'Analysis failed',
      },
    });

    // Update project status back to READY
    await prisma.project.update({
      where: { id: payload.projectId },
      data: { status: 'READY' },
    });
  }

  return { received: true };
}

/**
 * Verify HMAC signature for webhook
 */
export function verifyHmacSignature(
  payload: object,
  signature: string
): boolean {
  const secret = config.N8N_CALLBACK_SECRET || 'dev-secret';

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Generate a signed URL valid for 7 days (max allowed by GCS for n8n analysis)
 */
async function getSignedUrlForAnalysis(storagePath: string): Promise<string> {
  // Import storage bucket directly for custom expiry
  const { bucket } = await import('../lib/storage');

  const file = bucket.file(storagePath);
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (max allowed by GCS)
  });

  return url;
}

/**
 * Get the latest analysis job for a project (if any)
 */
export async function getLatestProjectJob(
  projectId: string
): Promise<AnalysisJob | null> {
  const job = await prisma.analysisJob.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  return job;
}
