import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import type { CreateProjectInput, UpdateProjectInput } from '../lib/schemas';

export async function createProject(userId: string, input: CreateProjectInput) {
  const project = await prisma.project.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
    },
  });

  return project;
}

export async function listProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      folders: {
        include: {
          _count: {
            select: { photos: true },
          },
        },
      },
      analysisJobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  // Transform to include counts
  return projects.map((project) => {
    const folderCount = project.folders.length;
    const photoCount = project.folders.reduce(
      (sum, folder) => sum + folder._count.photos,
      0
    );
    const latestAnalysis = project.analysisJobs[0] || null;

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      folderCount,
      photoCount,
      latestAnalysis: latestAnalysis
        ? {
            id: latestAnalysis.id,
            status: latestAnalysis.status,
            completedAt: latestAnalysis.completedAt,
            resultsSummary: latestAnalysis.resultsSummary,
            sheetUrl: latestAnalysis.sheetUrl,
            pdfUrl: latestAnalysis.pdfUrl,
          }
        : null,
    };
  });
}

export async function getProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      folders: {
        orderBy: { displayOrder: 'asc' },
        include: {
          _count: {
            select: { photos: true },
          },
        },
      },
      analysisJobs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  if (project.userId !== userId) {
    throw new ForbiddenError('You do not have access to this project');
  }

  // Transform folders to include photo count
  const folders = project.folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    roomType: folder.roomType,
    displayOrder: folder.displayOrder,
    photoCount: folder._count.photos,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  }));

  const latestAnalysis = project.analysisJobs[0] || null;

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    folders,
    latestAnalysis: latestAnalysis
      ? {
          id: latestAnalysis.id,
          status: latestAnalysis.status,
          triggeredAt: latestAnalysis.triggeredAt,
          startedAt: latestAnalysis.startedAt,
          completedAt: latestAnalysis.completedAt,
          errorMessage: latestAnalysis.errorMessage,
          resultsSummary: latestAnalysis.resultsSummary,
          sheetUrl: latestAnalysis.sheetUrl,
          pdfUrl: latestAnalysis.pdfUrl,
        }
      : null,
  };
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: UpdateProjectInput
) {
  // Verify ownership first
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!existing) {
    throw new NotFoundError('Project not found');
  }

  if (existing.userId !== userId) {
    throw new ForbiddenError('You do not have access to this project');
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    },
  });

  return project;
}

export async function deleteProject(userId: string, projectId: string) {
  // Verify ownership first
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!existing) {
    throw new NotFoundError('Project not found');
  }

  if (existing.userId !== userId) {
    throw new ForbiddenError('You do not have access to this project');
  }

  // Hard delete with cascade (defined in Prisma schema)
  await prisma.project.delete({
    where: { id: projectId },
  });

  return { success: true };
}

// Helper to verify project ownership (used by nested routes)
export async function verifyProjectOwnership(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  if (project.userId !== userId) {
    throw new ForbiddenError('You do not have access to this project');
  }

  return true;
}
