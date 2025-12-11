import { Router } from 'express';
import { asyncHandler } from '../middleware/validate';

const router = Router();

// POST /api/webhooks/n8n/analysis-complete - n8n callback (HMAC authenticated)
router.post('/n8n/analysis-complete', asyncHandler(async (_req, res) => {
  // TODO: Verify HMAC signature
  res.json({ message: 'Not implemented' });
}));

export default router;
