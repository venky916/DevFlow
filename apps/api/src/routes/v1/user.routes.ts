import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { getMe, getSidebarCounts, updateProfile } from "../../controllers/user.controller";
import { getMyIssuesBoard, getMyIssuesList } from "../../controllers/issue.controller";

const router = Router();

router.use(authenticate);

// /users
router.get("/me", getMe);
router.patch("/me", updateProfile);
router.get("/my-issues/board", getMyIssuesBoard)
router.get("/my-issues/list", getMyIssuesList)
router.get("/me/counts", getSidebarCounts)

export default router