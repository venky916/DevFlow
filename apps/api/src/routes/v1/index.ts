import { Router } from "express";
import { authenticate } from '../../middlewares/auth.middleware';
import authRoutes from "./auth.routes";
import workspaceRoutes from "./workspace.routes";
import projectRoutes from "./project.routes";
import sprintRoutes from "./sprint.routes";
import issueRoutes from "./issue.routes";
import uploadRouter from "./upload.routes"
import userRoutes from "./user.routes"
import commentRoutes from './comment.routes';
import activityRoutes from './activity.routes';
import notificationRoutes from "./notification.routes"
import { getAllProjectActivities, getProjectActivities } from '../../controllers/activity.controller';
import { requireProjectMember, requireWorkspaceMember } from '../../middlewares/permission.middleware';
import { acceptInvite } from "../../controllers/invite.controller";
import { getProjectAnalytics, getWorkspaceAnalytics } from "../../controllers/analytics.contoller";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes)
router.use("/workspaces", workspaceRoutes);
router.use('/workspaces/:workspaceId/projects', projectRoutes)
router.use("/projects", projectRoutes);
router.use("/projects/:id/sprints", sprintRoutes);
router.use("/sprints", sprintRoutes);
router.use("/projects/:id/issues", issueRoutes)
router.use("/issues", issueRoutes);
router.use('/issues/:id/comments', commentRoutes);
router.use('/comments', commentRoutes);
router.use('/issues/:id/activities', activityRoutes);
router.use("/notifications", notificationRoutes)

router.post("/invites/accept", authenticate, acceptInvite)

// project level activity
router.get(
    '/projects/:id/activities',
    authenticate,
    requireProjectMember,
    getProjectActivities
);
// add alongside existing project activities route:
router.get(
    '/projects/:id/activities/all',
    authenticate,
    requireProjectMember,
    getAllProjectActivities
)

router.get(
    '/projects/:id/analytics',
    authenticate,
    requireProjectMember,
    getProjectAnalytics
)

router.get(
    '/workspaces/:id/analytics',
    authenticate,
    requireWorkspaceMember,
    getWorkspaceAnalytics
)

// upload + attachments
router.use("/", uploadRouter)

export default router