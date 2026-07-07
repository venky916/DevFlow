import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { attachIssueProject, requireLeadOrAbove, requireProjectMember, requireProjectRole } from "../../middlewares/permission.middleware";
import { attachChildIssue, createIssue, createSubIssue, deleteIssue, detachChildIssue, getBacklogGrouped, getBacklogIssues, getBoardIssues, getIssueById, getSubIssues, moveIssue, moveIssueToSprint, searchProjectIssues, updateIssue } from "../../controllers/issue.controller";

const router = Router({ mergeParams: true });
router.use(authenticate);

// /projects/:id/issues
router.post("/", requireProjectMember, createIssue)
router.get("/board", requireProjectMember, getBoardIssues)
router.get("/backlog", requireProjectMember, getBacklogIssues)
router.get("/backlog/grouped", requireProjectMember, getBacklogGrouped)
router.get("/search", requireProjectMember, searchProjectIssues)

// /issues/:id
router.get("/:id", attachIssueProject, requireProjectMember, getIssueById)
router.patch("/:id", attachIssueProject, requireProjectMember, updateIssue)
router.patch("/:id/move", attachIssueProject, requireProjectMember, moveIssue)
router.patch("/:id/move-to-sprint", attachIssueProject, requireProjectRole('LEAD'), moveIssueToSprint)
router.delete("/:id", attachIssueProject, requireProjectRole("LEAD"), deleteIssue)


// sub issues related
router.post("/:id/children", attachIssueProject, requireProjectMember, createSubIssue)
router.get("/:id/children", attachIssueProject, requireProjectMember, getSubIssues)
router.post("/:id/children/attach", attachIssueProject, requireLeadOrAbove, attachChildIssue)
router.delete("/:id/children/:childId", attachIssueProject, requireLeadOrAbove, detachChildIssue)

export default router
