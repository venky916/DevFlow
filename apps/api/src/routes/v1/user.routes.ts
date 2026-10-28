import { Router } from 'express';

import {
  getMyIssuesBoard,
  getMyIssuesList,
  getMyIssuesProjects,
} from '../../controllers/issue.controller';
import { getMe, getSidebarCounts, updateProfile } from '../../controllers/user.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// /users
router.get('/me', getMe);
router.patch('/me', updateProfile);
router.get('/my-issues/board', getMyIssuesBoard);
router.get('/my-issues/list', getMyIssuesList);
router.get('/my-issues/projects', getMyIssuesProjects);
router.get('/me/counts', getSidebarCounts);

export default router;
