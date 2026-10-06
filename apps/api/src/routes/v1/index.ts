import { Router } from 'express';

import {
  getAllProjectActivities,
  getProjectActivities,
} from '../../controllers/activity.controller';
import { getProjectAnalytics, getWorkspaceAnalytics } from '../../controllers/analytics.contoller';
import { acceptInvite } from '../../controllers/invite.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  requireProjectMember,
  requireProjectRole,
  requireWorkspaceRole,
} from '../../middlewares/permission.middleware';
import activityRoutes from './activity.routes';
import authRoutes from './auth.routes';
import commentRoutes from './comment.routes';
import issueRoutes from './issue.routes';
import notificationRoutes from './notification.routes';
import projectRoutes from './project.routes';
import searchRoutes from './search.routes';
import sprintRoutes from './sprint.routes';
import uploadRouter from './upload.routes';
import userRoutes from './user.routes';
import workspaceRoutes from './workspace.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/search', searchRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/workspaces/:workspaceId/projects', projectRoutes);
router.use('/projects', projectRoutes);
router.use('/projects/:id/sprints', sprintRoutes);
router.use('/sprints', sprintRoutes);
router.use('/projects/:id/issues', issueRoutes);
router.use('/issues', issueRoutes);
router.use('/issues/:id/comments', commentRoutes);
router.use('/comments', commentRoutes);
router.use('/issues/:id/activities', activityRoutes);
router.use('/notifications', notificationRoutes);

router.post('/invites/accept', authenticate, acceptInvite);

// project level activity
router.get('/projects/:id/activities', authenticate, requireProjectMember, getProjectActivities);
// add alongside existing project activities route:
router.get(
  '/projects/:id/activities/all',
  authenticate,
  requireProjectMember,
  getAllProjectActivities,
);

router.get(
  '/projects/:id/analytics',
  authenticate,
  requireProjectRole('LEAD'),
  getProjectAnalytics,
);

router.get(
  '/workspaces/:id/analytics',
  authenticate,
  requireWorkspaceRole('ADMIN'),
  getWorkspaceAnalytics,
);

// upload + attachments
router.use('/', uploadRouter);

export default router;
