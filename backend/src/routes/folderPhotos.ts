import { Router } from 'express';
import multer from 'multer';
import { asyncHandler, validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { bulkDeletePhotosSchema } from '../lib/schemas';
import * as photoService from '../services/photoService';

const router = Router({ mergeParams: true }); // mergeParams to access :folderId

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
      'image/webp',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`));
    }
  },
});

// All routes require authentication
router.use(authenticate);

// GET /api/folders/:folderId/photos - List photos in folder
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { folderId } = req.params;

    const photos = await photoService.listPhotos(userId, folderId);
    res.json({ photos });
  })
);

// POST /api/folders/:folderId/photos/upload - Upload photo(s)
router.post(
  '/upload',
  upload.array('photos', 50), // Max 50 photos at once
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { folderId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        error: {
          code: 'NO_FILES',
          message: 'No files were uploaded',
        },
      });
      return;
    }

    // Upload all files
    const results = await Promise.allSettled(
      files.map((file) =>
        photoService.uploadPhoto(userId, folderId, {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        })
      )
    );

    // Separate successful and failed uploads
    const photos = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof photoService.uploadPhoto>>> =>
        r.status === 'fulfilled'
      )
      .map((r) => r.value);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r, i) => ({
        file: files[i]?.originalname || 'unknown',
        error: r.reason?.message || 'Upload failed',
      }));

    res.status(photos.length > 0 ? 201 : 400).json({
      photos,
      errors: errors.length > 0 ? errors : undefined,
      uploadedCount: photos.length,
      failedCount: errors.length,
    });
  })
);

// DELETE /api/folders/:folderId/photos/bulk - Bulk delete photos
// NOTE: Must be defined BEFORE /:photoId routes to avoid "bulk" being matched as a photoId
router.delete(
  '/bulk',
  validate(bulkDeletePhotosSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { folderId } = req.params;
    const { photoIds } = req.body;

    const result = await photoService.bulkDeletePhotos(userId, folderId, photoIds);
    res.json(result);
  })
);

// GET /api/folders/:folderId/photos/:photoId - Get single photo
router.get(
  '/:photoId',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { folderId, photoId } = req.params;

    const photo = await photoService.getPhoto(userId, folderId, photoId);
    res.json({ photo });
  })
);

// DELETE /api/folders/:folderId/photos/:photoId - Delete single photo
router.delete(
  '/:photoId',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { folderId, photoId } = req.params;

    await photoService.deletePhoto(userId, folderId, photoId);
    res.json({ success: true });
  })
);

export default router;
