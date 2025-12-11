import { prisma } from '../lib/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { verifyProjectOwnership } from './projectService';
import type { CreateFolderInput, UpdateFolderInput } from '../lib/schemas';

export async function listFolders(userId: string, projectId: string) {
  // Verify ownership
  await verifyProjectOwnership(userId, projectId);

  const folders = await prisma.folder.findMany({
    where: { projectId },
    orderBy: { displayOrder: 'asc' },
    include: {
      _count: {
        select: { photos: true },
      },
    },
  });

  return folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    roomType: folder.roomType,
    displayOrder: folder.displayOrder,
    photoCount: folder._count.photos,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  }));
}

export async function createFolder(
  userId: string,
  projectId: string,
  input: CreateFolderInput
) {
  // Verify ownership
  await verifyProjectOwnership(userId, projectId);

  // Get the max displayOrder for auto-assignment
  const maxOrder = await prisma.folder.aggregate({
    where: { projectId },
    _max: { displayOrder: true },
  });

  const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;

  const folder = await prisma.folder.create({
    data: {
      projectId,
      name: input.name,
      roomType: input.roomType,
      displayOrder,
    },
  });

  return {
    ...folder,
    photoCount: 0,
  };
}

export async function getFolder(
  userId: string,
  projectId: string,
  folderId: string
) {
  // Verify ownership
  await verifyProjectOwnership(userId, projectId);

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      _count: {
        select: { photos: true },
      },
    },
  });

  if (!folder) {
    throw new NotFoundError('Folder');
  }

  if (folder.projectId !== projectId) {
    throw new ForbiddenError('Folder does not belong to this project');
  }

  return {
    id: folder.id,
    name: folder.name,
    roomType: folder.roomType,
    displayOrder: folder.displayOrder,
    photoCount: folder._count.photos,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

export async function updateFolder(
  userId: string,
  projectId: string,
  folderId: string,
  input: UpdateFolderInput
) {
  // Verify ownership
  await verifyProjectOwnership(userId, projectId);

  // Verify folder exists and belongs to project
  const existing = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { projectId: true },
  });

  if (!existing) {
    throw new NotFoundError('Folder');
  }

  if (existing.projectId !== projectId) {
    throw new ForbiddenError('Folder does not belong to this project');
  }

  const folder = await prisma.folder.update({
    where: { id: folderId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.roomType !== undefined && { roomType: input.roomType }),
    },
    include: {
      _count: {
        select: { photos: true },
      },
    },
  });

  return {
    id: folder.id,
    name: folder.name,
    roomType: folder.roomType,
    displayOrder: folder.displayOrder,
    photoCount: folder._count.photos,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

export async function deleteFolder(
  userId: string,
  projectId: string,
  folderId: string
) {
  // Verify ownership
  await verifyProjectOwnership(userId, projectId);

  // Verify folder exists and belongs to project
  const existing = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { projectId: true },
  });

  if (!existing) {
    throw new NotFoundError('Folder');
  }

  if (existing.projectId !== projectId) {
    throw new ForbiddenError('Folder does not belong to this project');
  }

  // Delete folder (photos cascade delete is defined in Prisma schema)
  await prisma.folder.delete({
    where: { id: folderId },
  });

  return { success: true };
}

export async function reorderFolders(
  userId: string,
  projectId: string,
  folderIds: string[]
) {
  // Verify ownership
  await verifyProjectOwnership(userId, projectId);

  // Verify all folders exist and belong to this project
  const folders = await prisma.folder.findMany({
    where: { projectId },
    select: { id: true },
  });

  const existingIds = new Set(folders.map((f) => f.id));

  for (const folderId of folderIds) {
    if (!existingIds.has(folderId)) {
      throw new NotFoundError('Folder', folderId);
    }
  }

  // Update display order for all folders in a transaction
  await prisma.$transaction(
    folderIds.map((folderId, index) =>
      prisma.folder.update({
        where: { id: folderId },
        data: { displayOrder: index },
      })
    )
  );

  // Return updated folder list
  return listFolders(userId, projectId);
}
