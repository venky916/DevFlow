import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { createWorkspace, getMyWorkspaces, getWorkspaceById, updateWorkspace, deleteWorkspace, getWorkspaceMembers, updateMemberRole, removeMember } from "../../controllers/workspace.controller";
import { requireWorkspaceMember, requireWorkspaceRole } from "../../middlewares/permission.middleware.js";
import { createInvite, getWorkspaceInvites, cancelInvite } from "../../controllers/invite.controller.js";

const router = Router();

router.use(authenticate);

// Workspace CRUD
router.post("/", createWorkspace);
router.get("/", getMyWorkspaces);
router.get("/:id", getWorkspaceById);
router.patch("/:id", requireWorkspaceRole('ADMIN'), updateWorkspace);
router.delete("/:id", requireWorkspaceRole('ADMIN'), deleteWorkspace);

// Member management
router.get("/:id/members", requireWorkspaceMember, getWorkspaceMembers);
router.put("/:id/members/:uid", requireWorkspaceRole('ADMIN'), updateMemberRole);
router.delete("/:id/members/:uid", requireWorkspaceRole('ADMIN'), removeMember);

//Invite Management
router.post("/:id/invites", requireWorkspaceRole("ADMIN"), createInvite);
router.get("/:id/invites", requireWorkspaceRole("ADMIN"), getWorkspaceInvites);
router.delete("/:id/invites/:inviteId", requireWorkspaceRole("ADMIN"), cancelInvite);

export default router