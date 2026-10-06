import { Router } from 'express';

import { globalSearch } from '../../controllers/search.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', globalSearch);

export default router;
