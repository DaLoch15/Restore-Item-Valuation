import { Router } from 'express';
import { asyncHandler } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// All photo routes require authentication
router.use(authenticate);

// GET /api/photos/:id - Get single photo details
router.get('/:id', asyncHandler(async (_req, res) => {
  res.json({ message: 'Not implemented' });
}));

// PATCH /api/photos/:id - Update photo metadata
router.patch('/:id', asyncHandler(async (_req, res) => {
  res.json({ message: 'Not implemented' });
}));

// POST /api/photos/:id/move - Move photo to different folder
router.post('/:id/move', asyncHandler(async (_req, res) => {
  res.json({ message: 'Not implemented' });
}));

export default router;
