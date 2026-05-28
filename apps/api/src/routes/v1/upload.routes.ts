import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { getPresignedUploadUrl, deleteFile } from "../../controllers/upload.controller";
import { saveAttachment, getAttachments, deleteAttachment } from "../../controllers/attachement.controller";
import { updateWorkspaceLogo } from "../../controllers/workspace.controller";
import { requireProjectMember, requireWorkspaceMember } from "../../middlewares/permission.middleware";
import { updateAvatar } from "../../controllers/user.controller";


const router = Router();

router.use(authenticate);

// ─── B2 ONLY ──────────────────────────────────────────────────
router.post("/upload/presigned-url", getPresignedUploadUrl);
router.delete("/upload/:file", deleteFile);

// ─── ATTACHMENTS ──────────────────────────────────────────────
router.post("/issues/:id/attachments", saveAttachment);
router.get("/issues/:id/attachments", getAttachments);
router.delete("/issues/:id/attachments/:id", deleteAttachment);

// ─── AVATAR + LOGO ────────────────────────────────────────────
router.patch("/workspaces/:id/logo", updateWorkspaceLogo);
router.patch("/user/me/avatar", updateAvatar)

export default router;