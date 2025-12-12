import { Router, Request, Response } from 'express';
import { asyncHandler, validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { triggerAnalysisSchema } from '../lib/schemas';
import {
  triggerAnalysis,
  getAnalysisJob,
  getProjectAnalysisJobs,
} from '../services/analysisService';

const router = Router();

// All analysis routes require authentication
router.use(authenticate);

// POST /api/analysis/trigger - Trigger analysis for a project
router.post(
  '/trigger',
  validate(triggerAnalysisSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.body;
    const userId = req.user!.userId;

    const result = await triggerAnalysis(projectId, userId);

    res.json(result);
  })
);

// GET /api/analysis/project/:projectId - Get project's analysis jobs
// NOTE: This route must come before /:jobId to avoid conflict
router.get(
  '/project/:projectId',
  asyncHandler(async (req: Request, res: Response) => {
    const projectId = req.params.projectId as string;
    const userId = req.user!.userId;

    const jobs = await getProjectAnalysisJobs(projectId, userId);

    res.json(jobs);
  })
);

// GET /api/analysis/:jobId - Get job status
router.get(
  '/:jobId',
  asyncHandler(async (req: Request, res: Response) => {
    const jobId = req.params.jobId as string;
    const userId = req.user!.userId;

    const job = await getAnalysisJob(jobId, userId);

    res.json(job);
  })
);

export default router;
