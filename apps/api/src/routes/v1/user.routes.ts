import {Router} from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { getMe,updateProfile } from "../../controllers/user.controller";
import { getMyIssues } from "../../controllers/issue.controller";

const router = Router();

router.use(authenticate);

router.get("/me", getMe);
router.patch("/me", updateProfile);
router.get("/my-issues", getMyIssues);

export default router