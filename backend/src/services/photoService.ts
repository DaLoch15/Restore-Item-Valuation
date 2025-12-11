import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { prisma } from '../lib/prisma';
import { uploadFile, deleteFile, deleteFiles, getSignedUrl } from '../lib/storage';
import { NotFoundError, ForbiddenError, UploadFailedError } from '../lib/errors';
import { verifyProjectOwnership } from './projectService';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
];

// Max file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Thumbnail width
const THUMBNAIL_WIDTH = 400;

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

// Verify folder ownership and get projectId
async function verifyFolderOwnership(userId: string, folderId: string) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      project: {
        select: { userId: true, id: true },
      },
    },
  });

  if (!folder) {
    throw new NotFoundError('Folder');
  }

  if (folder.project.userId !== userId) {
    throw new ForbiddenError('You do not have access to this folder');
  }

  return {
    folderId: folder.id,
    projectId: folder.project.id,
  };
}

// Upload a single photo
export async function uploadPhoto(
  userId: string,
  folderId: string,
  file: UploadedFile
) {
  // Verify ownership
  const { projectId } = await verifyFolderOwnership(userId, folderId);

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new UploadFailedError(
      `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadFailedError(
      `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  // Generate unique filename
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const uniqueFilename = `${uuidv4()}${ext}`;

  // Define storage paths
  const photoPath = `photos/${projectId}/${folderId}/${uniqueFilename}`;
  const thumbnailPath = `thumbnails/${projectId}/${folderId}/${uniqueFilename}`;

  try {
    // Generate thumbnail using sharp
    const thumbnailBuffer = await sharp(file.buffer)
      .resize(THUMBNAIL_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload original photo and thumbnail in parallel
    await Promise.all([
      uploadFile(photoPath, file.buffer, file.mimetype),
      uploadFile(thumbnailPath, thumbnailBuffer, 'image/jpeg'),
    ]);

    // Get signed URLs
    const [storageUrl, thumbnailUrl] = await Promise.all([
      getSignedUrl(photoPath),
      getSignedUrl(thumbnailPath),
    ]);

    // Create database record
    const photo = await prisma.photo.create({
      data: {
        folderId,
        fileName: uniqueFilename,
        originalName: file.originalname,
        storagePath: photoPath,
        storageUrl,
        mimeType: file.mimetype,
        fileSize: file.size,
        thumbnailUrl,
        status: 'UPLOADED',
      },
    });

    return {
      id: photo.id,
      fileName: photo.fileName,
      originalName: photo.originalName,
      storageUrl: photo.storageUrl,
      thumbnailUrl: photo.thumbnailUrl,
      mimeType: photo.mimeType,
      fileSize: photo.fileSize,
      status: photo.status,
      createdAt: photo.createdAt,
    };
  } catch (error) {
    // Clean up any uploaded files on error
    try {
      await deleteFiles([photoPath, thumbnailPath]);
    } catch {
      // Ignore cleanup errors
    }

    if (error instanceof UploadFailedError) {
      throw error;
    }
    throw new UploadFailedError('Failed to upload photo');
  }
}

// List photos for a folder with fresh signed URLs
export async function listPhotos(userId: string, folderId: string) {
  // Verify ownership
  await verifyFolderOwnership(userId, folderId);

  const photos = await prisma.photo.findMany({
    where: { folderId },
    orderBy: { createdAt: 'asc' },
  });

  // Generate fresh signed URLs for each photo
  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => {
      const [storageUrl, thumbnailUrl] = await Promise.all([
        getSignedUrl(photo.storagePath),
        photo.thumbnailUrl ? getSignedUrl(photo.storagePath.replace('photos/', 'thumbnails/')) : null,
      ]);

      return {
        id: photo.id,
        fileName: photo.fileName,
        originalName: photo.originalName,
        storageUrl,
        thumbnailUrl,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        status: photo.status,
        createdAt: photo.createdAt,
      };
    })
  );

  return photosWithUrls;
}

// Delete a single photo
export async function deletePhoto(
  userId: string,
  folderId: string,
  photoId: string
) {
  // Verify ownership
  await verifyFolderOwnership(userId, folderId);

  // Get photo
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
  });

  if (!photo) {
    throw new NotFoundError('Photo');
  }

  if (photo.folderId !== folderId) {
    throw new ForbiddenError('Photo does not belong to this folder');
  }

  // Delete from GCS
  const thumbnailPath = photo.storagePath.replace('photos/', 'thumbnails/');
  await deleteFiles([photo.storagePath, thumbnailPath]);

  // Delete from database
  await prisma.photo.delete({
    where: { id: photoId },
  });

  return { success: true };
}

// Bulk delete photos
export async function bulkDeletePhotos(
  userId: string,
  folderId: string,
  photoIds: string[]
) {
  // Verify ownership
  await verifyFolderOwnership(userId, folderId);

  // Get all photos
  const photos = await prisma.photo.findMany({
    where: {
      id: { in: photoIds },
      folderId,
    },
  });

  if (photos.length === 0) {
    return { deletedCount: 0 };
  }

  // Collect all storage paths
  const pathsToDelete = photos.flatMap((photo) => [
    photo.storagePath,
    photo.storagePath.replace('photos/', 'thumbnails/'),
  ]);

  // Delete from GCS
  await deleteFiles(pathsToDelete);

  // Delete from database
  const result = await prisma.photo.deleteMany({
    where: {
      id: { in: photos.map((p) => p.id) },
    },
  });

  return { deletedCount: result.count };
}

// Get a single photo with fresh signed URL
export async function getPhoto(userId: string, folderId: string, photoId: string) {
  // Verify ownership
  await verifyFolderOwnership(userId, folderId);

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
  });

  if (!photo) {
    throw new NotFoundError('Photo');
  }

  if (photo.folderId !== folderId) {
    throw new ForbiddenError('Photo does not belong to this folder');
  }

  const [storageUrl, thumbnailUrl] = await Promise.all([
    getSignedUrl(photo.storagePath),
    photo.thumbnailUrl ? getSignedUrl(photo.storagePath.replace('photos/', 'thumbnails/')) : null,
  ]);

  return {
    id: photo.id,
    fileName: photo.fileName,
    originalName: photo.originalName,
    storageUrl,
    thumbnailUrl,
    mimeType: photo.mimeType,
    fileSize: photo.fileSize,
    status: photo.status,
    createdAt: photo.createdAt,
  };
}
