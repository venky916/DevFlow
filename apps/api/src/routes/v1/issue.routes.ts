import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { attachIssueProject, requireProjectMember, requireProjectRole } from "../../middlewares/permission.middleware";
import { createIssue, deleteIssue, getBacklogGrouped, getBacklogIssues, getBoardIssues, getIssueById, moveIssue, moveIssueToSprint, updateIssue } from "../../controllers/issue.controller";

const router = Router({ mergeParams: true });
router.use(authenticate);

// /projects/:id/issues
router.post("/", requireProjectMember, createIssue)
router.get("/board", requireProjectMember, getBoardIssues)
router.get("/backlog", requireProjectMember, getBacklogIssues)
router.get("/backlog/grouped", requireProjectMember, getBacklogGrouped)

// /issues/:id
router.get("/:id", attachIssueProject, requireProjectMember, getIssueById)
router.patch("/:id", attachIssueProject, requireProjectMember, updateIssue)
router.patch("/:id/move", attachIssueProject, requireProjectMember, moveIssue)
router.patch("/:id/move-to-sprint", attachIssueProject, requireProjectRole('LEAD'), moveIssueToSprint)
router.delete("/:id", attachIssueProject, requireProjectRole("LEAD"), deleteIssue)

export default router
