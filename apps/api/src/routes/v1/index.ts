import { Router } from "express";
import authRoutes from "./auth.routes";
import workspaceRoutes from "./workspace.routes";
import projectRoutes from "./project.routes";
import sprintRoutes from "./sprint.routes";
import issueRoutes from "./issue.routes";
import uploadRouter from "./upload.routes"
import userRoutes from "./user.routes"

const router = Router();

router.use("/auth", authRoutes);
router.use("/workspaces", workspaceRoutes);
router.use('/workspaces/:workspaceId/projects', projectRoutes)
router.use("/projects", projectRoutes);
router.use("/projects/:id/sprints", sprintRoutes);
router.use("/sprints", sprintRoutes);
router.use("/projects/:id/issues", issueRoutes)
router.use("/issues", issueRoutes);
router.use("/users", userRoutes)
router.use("/", uploadRouter)

export default router