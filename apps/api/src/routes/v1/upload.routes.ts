import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { getPresignedUploadUrl } from "../../controllers/upload.controller";
import { saveAttachment, getAttachments, deleteAttachment, getAttachmentDownloadUrl } from "../../controllers/attachement.controller";
import { updateWorkspaceLogo } from "../../controllers/workspace.controller";
import { attachAttachmentProject, attachIssueProject, requireProjectMember, requireProjectRole, requireWorkspaceMember, requireWorkspaceRole } from "../../middlewares/permission.middleware";
import { updateAvatar } from "../../controllers/user.controller";


const router = Router();

router.use(authenticate);

// ─── B2 ONLY ──────────────────────────────────────────────────
router.post("/upload/presigned-url", getPresignedUploadUrl);

// ─── ATTACHMENTS ──────────────────────────────────────────────
router.post("/issues/:id/attachments", attachIssueProject, requireProjectRole('LEAD', 'DEVELOPER'), saveAttachment);
router.get("/issues/:id/attachments", attachIssueProject, requireProjectMember, getAttachments);
router.delete("/issues/:id/attachments/:attachmentId", attachAttachmentProject, requireProjectMember, deleteAttachment);
router.get("/issues/:id/attachments/:attachmentId/download-url", attachAttachmentProject, requireProjectMember, getAttachmentDownloadUrl);

// ─── AVATAR + LOGO ────────────────────────────────────────────
router.patch("/workspaces/:id/logo", requireWorkspaceRole('ADMIN'), updateWorkspaceLogo);
router.patch("/users/me/avatar", updateAvatar)

export default router;