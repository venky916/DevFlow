import { Router } from 'express';

import {
  clearReadNotifications,
  deleteNotification,
  getNotifications,
  markAllAsRead,
  markAsRead,
} from '../../controllers/notification.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.delete('/', clearReadNotifications);

export default router;
