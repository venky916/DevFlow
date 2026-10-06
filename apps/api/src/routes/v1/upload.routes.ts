import { Router } from 'express';

import {
  deleteAttachment,
  getAttachmentDownloadUrl,
  getAttachments,
  saveAttachment,
} from '../../controllers/attachement.controller';
import { requestUploadUrl } from '../../controllers/upload.controller';
import { updateAvatar } from '../../controllers/user.controller';
import { updateWorkspaceLogo } from '../../controllers/workspace.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  attachAttachmentProject,
  attachIssueProject,
  requireProjectMember,
  requireProjectRole,
  requireWorkspaceMember,
  requireWorkspaceRole,
} from '../../middlewares/permission.middleware';

const router = Router();

router.use(authenticate);

// ─── B2 ONLY ──────────────────────────────────────────────────
router.post('/upload/presigned-url', requestUploadUrl);

// ─── ATTACHMENTS ──────────────────────────────────────────────
router.post(
  '/issues/:id/attachments',
  attachIssueProject,
  requireProjectRole('LEAD', 'DEVELOPER'),
  saveAttachment,
);
router.get('/issues/:id/attachments', attachIssueProject, requireProjectMember, getAttachments);
router.delete(
  '/issues/:id/attachments/:attachmentId',
  attachAttachmentProject,
  requireProjectMember,
  deleteAttachment,
);
router.get(
  '/issues/:id/attachments/:attachmentId/download-url',
  attachAttachmentProject,
  requireProjectMember,
  getAttachmentDownloadUrl,
);

// ─── AVATAR + LOGO ────────────────────────────────────────────
router.patch('/workspaces/:id/logo', requireWorkspaceRole('ADMIN'), updateWorkspaceLogo);
router.patch('/users/me/avatar', updateAvatar);

export default router;
