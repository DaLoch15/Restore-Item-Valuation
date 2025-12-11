import { Router } from 'express';
import { asyncHandler } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// All analysis routes require authentication
router.use(authenticate);

// POST /api/analysis/trigger - Trigger analysis for a project
router.post('/trigger', asyncHandler(async (_req, res) => {
  res.json({ message: 'Not implemented' });
}));

// GET /api/analysis/:jobId - Get job status
router.get('/:jobId', asyncHandler(async (_req, res) => {
  res.json({ message: 'Not implemented' });
}));

// GET /api/analysis/project/:projectId - Get project's analysis jobs
router.get('/project/:projectId', asyncHandler(async (_req, res) => {
  res.json({ message: 'Not implemented' });
}));

export default router;
