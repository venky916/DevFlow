import { Router } from 'express';

import { forgotPassword, me } from '../../controllers/auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

// /auth
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticate, me);

export default router;
