import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { createComment, deleteComment, getComments, updateComment } from "../../controllers/comment.controller";
import { requireProjectMember, attachIssueProject } from "../../middlewares/permission.middleware";


const router = Router({ mergeParams: true });

router.use(authenticate);

// /issues/:id/comments
router.post("/", attachIssueProject, requireProjectMember, createComment)
router.get("/", attachIssueProject, requireProjectMember, getComments)

// /comments/:id
router.patch("/:id", updateComment)
router.delete("/:id", deleteComment)


export default router