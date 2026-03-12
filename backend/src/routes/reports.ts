import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  generateXactimateCSV,
  generateSummaryJSON,
} from '../services/reportService';

const router = Router();

// All report routes require authentication
router.use(authenticate);

// GET /api/reports/:jobId/xactimate - Download Xactimate CSV
router.get(
  '/:jobId/xactimate',
  asyncHandler(async (req: Request, res: Response) => {
    const jobId = req.params.jobId!;
    const userId = req.user!.userId;

    const csvBuffer = await generateXactimateCSV(jobId, userId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="xactimate-${jobId}.csv"`);
    res.send(csvBuffer);
  })
);

// GET /api/reports/:jobId/summary - Get report summary JSON
router.get(
  '/:jobId/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const jobId = req.params.jobId!;
    const userId = req.user!.userId;

    const summary = await generateSummaryJSON(jobId, userId);

    res.json(summary);
  })
);

export default router;
