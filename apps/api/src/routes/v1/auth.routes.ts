import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { forgotPassword, me } from "../../controllers/auth.controller.js";

const router = Router();

// /auth
router.post("/forgot-password", forgotPassword)
router.get('/me', authenticate, me);

export default router