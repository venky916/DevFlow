import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { createProject, getProjectById, updateProject, deleteProject, getProjects, getProjectMembers, removeProjectMember, addProjectMember } from "../../controllers/project.controller.js";
import {
    requireWorkspaceMember,
    requireWorkspaceRole,
    requireProjectMember,
    requireProjectRole
} from "../../middlewares/permission.middleware.js";
import { updateMemberRole } from "../../controllers/workspace.controller";

const router = Router({ mergeParams: true });

router.use(authenticate);

// Project CRUD
router.post("/", requireWorkspaceRole('OWNER', 'ADMIN'), createProject);
router.get("/", requireWorkspaceMember, getProjects);
router.get("/:id", requireProjectMember, getProjectById);
router.patch("/:id", requireProjectRole('LEAD'), updateProject);
router.delete("/:id", requireWorkspaceRole('OWNER', 'ADMIN'), deleteProject);

// Member management
router.get("/:id/members", requireProjectMember, getProjectMembers);
router.post("/:id/members", requireProjectMember, addProjectMember);
router.put("/:id/members/:uid", requireProjectRole('LEAD'), updateMemberRole);
router.delete("/:id/members/:uid", requireProjectRole('LEAD'), removeProjectMember);

export default router