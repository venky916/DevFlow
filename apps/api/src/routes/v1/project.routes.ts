import { Router } from 'express';

import {
  addProjectMember,
  createLabel,
  createProject,
  deleteLabel,
  deleteProject,
  getLabels,
  getProjectById,
  getProjectMembers,
  getProjects,
  removeProjectMember,
  updateLabel,
  updateProject,
} from '../../controllers/project.controller.js';
import { updateMemberRole } from '../../controllers/workspace.controller';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  requireProjectMember,
  requireProjectRole,
  requireWorkspaceMember,
  requireWorkspaceRole,
} from '../../middlewares/permission.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Project CRUD
router.post('/', requireWorkspaceRole('ADMIN'), createProject);
router.get('/', requireWorkspaceMember, getProjects);
router.get('/:id', requireProjectMember, getProjectById);
router.patch('/:id', requireProjectRole('LEAD'), updateProject);
router.delete('/:id', requireWorkspaceRole('ADMIN'), deleteProject);

// Member management
router.get('/:id/members', requireProjectMember, getProjectMembers);
router.post('/:id/members', requireProjectRole('LEAD'), addProjectMember);
router.put('/:id/members/:uid', requireProjectRole('LEAD'), updateMemberRole);
router.delete('/:id/members/:uid', requireProjectRole('LEAD'), removeProjectMember);

// Labels — LEAD/ADMIN only for mutations, any member can read
router.get('/:id/labels', requireProjectMember, getLabels);
router.post('/:id/labels', requireProjectRole('LEAD'), createLabel);
router.patch('/:id/labels/:labelId', requireProjectRole('LEAD'), updateLabel);
router.delete('/:id/labels/:labelId', requireProjectRole('LEAD'), deleteLabel);

export default router;
