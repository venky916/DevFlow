import { Router } from "express";
import authRoutes from "./auth.routes.js";
import workspaceRoutes from "./workspace.routes.js";
import projectRoutes from "./project.routes.js";
import sprintRoutes from "./sprint.routes.js";
import issueRoutes from "./issue.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/workspaces", workspaceRoutes);
router.use('/workspaces/:workspaceId/projects', projectRoutes)
router.use("/projects", projectRoutes);
router.use("/projects/:id/sprints", sprintRoutes);
router.use("/sprints", sprintRoutes);
router.use("/projects/:id/issues", issueRoutes)
router.use("/issues", issueRoutes);

export default router