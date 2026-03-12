import { Router, Request, Response } from 'express';
import { asyncHandler, validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { updateInventoryItemSchema, bulkUpdateInventorySchema } from '../lib/schemas';
import {
  listItemsByJob,
  getJobSummary,
  listItemsByFolder,
  getItem,
  updateItem,
  deleteItem,
  bulkUpdateItems,
} from '../services/inventoryService';

const router = Router();

// All inventory routes require authentication
router.use(authenticate);

// PATCH /api/inventory/bulk - Bulk update items (must be before /:itemId)
router.patch(
  '/bulk',
  validate(bulkUpdateInventorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { itemIds, updates } = req.body;

    const result = await bulkUpdateItems(itemIds, userId, updates);

    res.json(result);
  })
);

// GET /api/inventory/job/:jobId/summary - Get job summary (must be before /job/:jobId)
router.get(
  '/job/:jobId/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const jobId = req.params.jobId as string;
    const userId = req.user!.userId;

    const summary = await getJobSummary(jobId, userId);

    res.json(summary);
  })
);

// GET /api/inventory/job/:jobId - List items by job
router.get(
  '/job/:jobId',
  asyncHandler(async (req: Request, res: Response) => {
    const jobId = req.params.jobId as string;
    const userId = req.user!.userId;

    const items = await listItemsByJob(jobId, userId);

    res.json(items);
  })
);

// GET /api/inventory/folder/:folderId - List items by folder
router.get(
  '/folder/:folderId',
  asyncHandler(async (req: Request, res: Response) => {
    const folderId = req.params.folderId as string;
    const userId = req.user!.userId;

    const items = await listItemsByFolder(folderId, userId);

    res.json(items);
  })
);

// GET /api/inventory/:itemId - Get single item
router.get(
  '/:itemId',
  asyncHandler(async (req: Request, res: Response) => {
    const itemId = req.params.itemId as string;
    const userId = req.user!.userId;

    const item = await getItem(itemId, userId);

    res.json(item);
  })
);

// PATCH /api/inventory/:itemId - Update single item
router.patch(
  '/:itemId',
  validate(updateInventoryItemSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const itemId = req.params.itemId as string;
    const userId = req.user!.userId;

    const item = await updateItem(itemId, userId, req.body);

    res.json(item);
  })
);

// DELETE /api/inventory/:itemId - Delete single item
router.delete(
  '/:itemId',
  asyncHandler(async (req: Request, res: Response) => {
    const itemId = req.params.itemId as string;
    const userId = req.user!.userId;

    const result = await deleteItem(itemId, userId);

    res.json(result);
  })
);

export default router;
