import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { createWorkspace, getMyWorkspaces, getWorkspaceById, updateWorkspace, deleteWorkspace, getWorkspaceMembers, updateMemberRole, removeMember } from "../../controllers/workspace.controller";
import { requireWorkspaceRole } from "../../middlewares/permission.middleware.js";
import { createInvite, getWorkspaceInvites, cancelInvite } from "../../controllers/invite.controller.js";

const router = Router();

router.use(authenticate);

// Workspace CRUD
router.post("/", createWorkspace);
router.get("/", getMyWorkspaces);
router.get("/:id", getWorkspaceById);
router.patch("/:id", requireWorkspaceRole('OWNER', 'ADMIN'), updateWorkspace);
router.delete("/:id", requireWorkspaceRole('OWNER'), deleteWorkspace);

// Member management
router.get("/:id/members", getWorkspaceMembers);
router.put("/:id/members/:uid", updateMemberRole);
router.delete("/:id/members/:uid", removeMember);

//Invite Management
router.post("/:id/invites", requireWorkspaceRole('OWNER', "ADMIN"), createInvite);
router.get("/:id/invites", requireWorkspaceRole('OWNER', "ADMIN"), getWorkspaceInvites);
router.delete("/:id/invites/:inviteId", requireWorkspaceRole('OWNER', "ADMIN"), cancelInvite);

export default router