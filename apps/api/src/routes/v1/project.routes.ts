import { Router } from 'express';

import {
  addProjectMember,
  createLabel,
  createProject,
  deleteLabel,
  deleteProject,
  getAvailableProjectMembers,
  getLabels,
  getProjectById,
  getProjectBySlug,
  getProjectMembers,
  getProjects,
  getProjectSummaries,
  removeProjectMember,
  updateLabel,
  updateProject,
  updateProjectMemberRole,
} from '../../controllers/project.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireProjectMember,
  requireProjectRole,
  requireProjectWorkspaceAdmin,
  requireWorkspaceMember,
  requireWorkspaceRole,
} from '../../middlewares/permission.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Project CRUD
router.post('/', requireWorkspaceRole('ADMIN'), createProject);
router.get('/', requireWorkspaceMember, getProjects);
router.get('/summary', requireWorkspaceMember, getProjectSummaries); // NEW: /workspaces/:workspaceId/projects/summary
router.get('/by-slug/:workspaceSlug/:projectSlug', getProjectBySlug); // NEW: /projects/by-slug/...
router.get('/:id', requireProjectMember, getProjectById);
router.patch('/:id', requireProjectRole('LEAD'), updateProject);
router.delete('/:id', requireProjectWorkspaceAdmin, deleteProject);

// Member management
router.get('/:id/members', requireProjectMember, getProjectMembers);
router.get('/:id/available-members', requireProjectRole('LEAD'), getAvailableProjectMembers);
router.post('/:id/members', requireProjectRole('LEAD'), addProjectMember);
router.put('/:id/members/:uid', requireProjectRole('LEAD'), updateProjectMemberRole);
router.delete('/:id/members/:uid', requireProjectRole('LEAD'), removeProjectMember);

// Labels — LEAD/ADMIN only for mutations, any member can read
router.get('/:id/labels', requireProjectMember, getLabels);
router.post('/:id/labels', requireProjectRole('LEAD'), createLabel);
router.patch('/:id/labels/:labelId', requireProjectRole('LEAD'), updateLabel);
router.delete('/:id/labels/:labelId', requireProjectRole('LEAD'), deleteLabel);

export default router;
