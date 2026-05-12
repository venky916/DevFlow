import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {me} from "../../controllers/auth.controller.js";

const router = Router();

router.get('/me', authenticate, me);

export default router