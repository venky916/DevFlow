import { NotificationTypes } from '@devflow/types';

import { createRedisConnection } from './connection';
import { createTracedQueue, type WithRequestId } from './traced-queue';

export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

// ─── Job data type ────────────────────────────────────────────────
export interface NotificationJobData extends WithRequestId {
  userId: string; // who receives the notification
  type: NotificationType;
  content: string; // e.g. "Ravi assigned you to Fix login bug"
  link?: string; // e.g. "/projects/abc/issues/xyz"
  triggeredBy: string; // userId of who triggered it
}

export const notificationQueue = createTracedQueue<NotificationJobData>('notification-queue', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
