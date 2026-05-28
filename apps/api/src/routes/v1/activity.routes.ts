import {Router} from "express";
import {authenticate} from "../../middlewares/auth.middleware";
import { requireProjectMember,attachIssueProject } from "../../middlewares/permission.middleware";
import { getIssueActivities,getProjectActivities } from "../../controllers/activity.controller";

const router = Router({mergeParams:true});

router.use(authenticate)

router.get("/",attachIssueProject,requireProjectMember,getIssueActivities)

export default router