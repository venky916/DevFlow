import { Router } from 'express';

import { forgotPassword } from '../../controllers/auth.controller.js';

const router = Router();

// /auth
router.post('/forgot-password', forgotPassword);

export default router;
