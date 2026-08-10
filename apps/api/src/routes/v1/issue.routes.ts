import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { attachIssueProject, requireIssueMoveAccess, requireProjectMember, requireProjectRole } from "../../middlewares/permission.middleware";
import { attachChildIssue, createIssue, createSubIssue, deleteIssue, detachChildIssue, getBacklogGrouped, getBacklogIssues, getBoardIssues, getIssueById, getSubIssues, moveIssue, moveIssueToSprint, searchProjectIssues, updateIssue } from "../../controllers/issue.controller";

const router = Router({ mergeParams: true });
router.use(authenticate);

// /projects/:id/issues
router.post("/", requireProjectRole('LEAD', 'DEVELOPER'), createIssue)
router.get("/board", requireProjectMember, getBoardIssues)
router.get("/backlog", requireProjectMember, getBacklogIssues)
router.get("/backlog/grouped", requireProjectMember, getBacklogGrouped)
router.get("/search", requireProjectMember, searchProjectIssues)

// /issues/:id
router.get("/:id", attachIssueProject, requireProjectMember, getIssueById)
router.patch("/:id", attachIssueProject, requireProjectRole('LEAD', 'DEVELOPER'), updateIssue)
router.patch("/:id/move", attachIssueProject, requireIssueMoveAccess, moveIssue)
router.patch("/:id/move-to-sprint", attachIssueProject, requireProjectRole('LEAD'), moveIssueToSprint)
router.delete("/:id", attachIssueProject, requireProjectRole("LEAD"), deleteIssue)


// sub issues related
router.post("/:id/children", attachIssueProject, requireProjectRole('LEAD'), createSubIssue)
router.get("/:id/children", attachIssueProject, requireProjectMember, getSubIssues)
router.post("/:id/children/attach", attachIssueProject, requireProjectRole('LEAD'), attachChildIssue)
router.delete("/:id/children/:childId", attachIssueProject, requireProjectRole('LEAD'), detachChildIssue)

export default router
