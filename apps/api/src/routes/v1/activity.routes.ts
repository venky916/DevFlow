import { Router } from 'express';

import { getIssueActivities, getProjectActivities } from '../../controllers/activity.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { attachIssueProject, requireProjectMember } from '../../middlewares/permission.middleware';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', attachIssueProject, requireProjectMember, getIssueActivities);

export default router;
