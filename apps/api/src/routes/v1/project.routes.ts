import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { createProject, getProjectById, updateProject, deleteProject, getProjects, getProjectMembers, removeProjectMember, addProjectMember, createLabel, getLabels, updateLabel, deleteLabel } from "../../controllers/project.controller.js";
import {
    requireWorkspaceMember,
    requireWorkspaceRole,
    requireProjectMember,
    requireProjectRole,
    requireLeadOrAbove
} from "../../middlewares/permission.middleware.js";
import { updateMemberRole } from "../../controllers/workspace.controller";

const router = Router({ mergeParams: true });

router.use(authenticate);

// Project CRUD
router.post("/", requireWorkspaceRole('ADMIN'), createProject);
router.get("/", requireWorkspaceMember, getProjects);
router.get("/:id", requireProjectMember, getProjectById);
router.patch("/:id", requireLeadOrAbove, updateProject);
router.delete("/:id", requireWorkspaceRole('ADMIN'), deleteProject);

// Member management
router.get("/:id/members", requireProjectMember, getProjectMembers);
router.post("/:id/members", requireLeadOrAbove, addProjectMember);
router.put("/:id/members/:uid", requireLeadOrAbove, updateMemberRole);
router.delete("/:id/members/:uid", requireLeadOrAbove, removeProjectMember);

// Labels — LEAD/ADMIN only for mutations, any member can read
router.get("/:id/labels", requireProjectMember, getLabels);
router.post("/:id/labels", requireLeadOrAbove, createLabel);
router.patch("/:id/labels/:labelId", requireLeadOrAbove, updateLabel);
router.delete("/:id/labels/:labelId", requireLeadOrAbove, deleteLabel);

export default router