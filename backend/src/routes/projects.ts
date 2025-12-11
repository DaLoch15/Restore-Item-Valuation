import { Router } from 'express';
import { asyncHandler, validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  createProjectSchema,
  updateProjectSchema,
  createFolderSchema,
  updateFolderSchema,
  reorderFoldersSchema,
} from '../lib/schemas';
import * as projectService from '../services/projectService';
import * as folderService from '../services/folderService';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// GET /api/projects - List user's projects
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const projects = await projectService.listProjects(userId);
    res.json({ projects });
  })
);

// POST /api/projects - Create project
router.post(
  '/',
  validate(createProjectSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const project = await projectService.createProject(userId, req.body);
    res.status(201).json({ project });
  })
);

// GET /api/projects/:id - Get project with folders
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const project = await projectService.getProject(userId, req.params.id);
    res.json({ project });
  })
);

// PATCH /api/projects/:id - Update project
router.patch(
  '/:id',
  validate(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const project = await projectService.updateProject(
      userId,
      req.params.id,
      req.body
    );
    res.json({ project });
  })
);

// DELETE /api/projects/:id - Delete project
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    await projectService.deleteProject(userId, req.params.id);
    res.json({ success: true });
  })
);

// ===== FOLDER ROUTES =====

// PATCH /api/projects/:projectId/folders/reorder - Reorder folders
// NOTE: Must be before /:projectId/folders/:id to avoid route conflict
router.patch(
  '/:projectId/folders/reorder',
  validate(reorderFoldersSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const folders = await folderService.reorderFolders(
      userId,
      req.params.projectId,
      req.body.folderIds
    );
    res.json({ folders });
  })
);

// GET /api/projects/:projectId/folders - List folders
router.get(
  '/:projectId/folders',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const folders = await folderService.listFolders(userId, req.params.projectId);
    res.json({ folders });
  })
);

// POST /api/projects/:projectId/folders - Create folder
router.post(
  '/:projectId/folders',
  validate(createFolderSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const folder = await folderService.createFolder(
      userId,
      req.params.projectId,
      req.body
    );
    res.status(201).json({ folder });
  })
);

// PATCH /api/projects/:projectId/folders/:id - Update folder
router.patch(
  '/:projectId/folders/:id',
  validate(updateFolderSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const folder = await folderService.updateFolder(
      userId,
      req.params.projectId,
      req.params.id,
      req.body
    );
    res.json({ folder });
  })
);

// DELETE /api/projects/:projectId/folders/:id - Delete folder
router.delete(
  '/:projectId/folders/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    await folderService.deleteFolder(
      userId,
      req.params.projectId,
      req.params.id
    );
    res.json({ success: true });
  })
);

export default router;
