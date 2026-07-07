import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { attachSprintProject, requireProjectMember, requireProjectRole } from "../../middlewares/permission.middleware";
import { completeSprint, createSprint, deleteSprint, getSprintById, getSprints, startSprint, updateSprint } from "../../controllers/sprint.controller";

const router = Router({ mergeParams: true });

router.use(authenticate);

// /projects/:id/sprints
router.post("/", requireProjectRole('LEAD'), createSprint);
router.get("/", requireProjectMember, getSprints);

// /sprints/:id
router.get("/:id", attachSprintProject, requireProjectMember, getSprintById);
router.patch("/:id", attachSprintProject, requireProjectRole('LEAD'), updateSprint);
router.delete("/:id", attachSprintProject, requireProjectRole('LEAD'), deleteSprint);

// Sprint actions
router.post("/:id/start", attachSprintProject, requireProjectRole('LEAD'), startSprint);
router.post("/:id/complete", attachSprintProject, requireProjectRole('LEAD'), completeSprint);

export default router