import { Router } from 'express';

import {
  cancelInvite,
  createInvite,
  getWorkspaceInvites,
} from '../../controllers/invite.controller.js';
import {
  createWorkspace,
  deleteWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  getWorkspaceMembers,
  removeMember,
  updateMemberRole,
  updateWorkspace,
} from '../../controllers/workspace.controller';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { requireWorkspaceRole } from '../../middlewares/permission.middleware.js';

const router = Router();

router.use(authenticate);

// /workspaces
// Workspace CRUD
router.post('/', createWorkspace);
router.get('/', getMyWorkspaces);
router.get('/:id', getWorkspaceById);
router.patch('/:id', requireWorkspaceRole('ADMIN'), updateWorkspace);
router.delete('/:id', requireWorkspaceRole('ADMIN'), deleteWorkspace);

// Member management
router.get('/:id/members', requireWorkspaceRole('ADMIN'), getWorkspaceMembers);
router.put('/:id/members/:uid', requireWorkspaceRole('ADMIN'), updateMemberRole);
router.delete('/:id/members/:uid', requireWorkspaceRole('ADMIN'), removeMember);

//Invite Management
router.post('/:id/invites', requireWorkspaceRole('ADMIN'), createInvite);
router.get('/:id/invites', requireWorkspaceRole('ADMIN'), getWorkspaceInvites);
router.delete('/:id/invites/:inviteId', requireWorkspaceRole('ADMIN'), cancelInvite);

export default router;
