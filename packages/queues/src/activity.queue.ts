import { ActivityScope } from '@devflow/types';

import { createRedisConnection } from './connection';
import { createTracedQueue, type WithRequestId } from './traced-queue';

// ─── Job data type ────────────────────────────────────────────────
export interface ActivityJobData extends WithRequestId {
  action: string; // e.g. "ISSUE_STATUS_CHANGED"
  scope: ActivityScope;
  userId: string; // who did the action
  projectId: string; // which project
  issueId?: string; // which issue (optional — some actions are project level)
  meta?: Record<string, any>; // extra data e.g. { from: "TODO", to: "IN_PROGRESS" }
}

export const activityQueue = createTracedQueue<ActivityJobData>('activity-queue', {
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
