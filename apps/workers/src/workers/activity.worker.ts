import { Job, Worker } from 'bullmq';

import { logger, publisher } from '@devflow/backend-common';
import { prisma } from '@devflow/db';
import { ActivityJobData, createRedisConnection } from '@devflow/queues';
import { IssueEvents } from '@devflow/types';

async function activityFunction(job: Job<ActivityJobData>) {
  const { action, userId, projectId, issueId, meta, scope } = job.data;

  logger.debug({ jobId: job.id, action }, 'Processing activity job');

  await prisma.activityLog.create({
    data: {
      action,
      scope: scope ?? 'PROJECT',
      userId,
      projectId,
      issueId: issueId ?? null,
      meta,
    },
  });

  // tell the people who have this issue open that the feed has a new line.
  // Best effort: if this fails, the row is already saved, and a retry would write it twice.
  if (issueId) {
    try {
      await publisher.publish(
        `issue:${issueId}`,
        JSON.stringify({ type: IssueEvents.ACTIVITY_ADDED, payload: { issueId } }),
      );
    } catch (err) {
      logger.warn({ jobId: job.id, err }, 'Could not publish ACTIVITY_ADDED');
    }
  }
}

export const activityWorker = new Worker<ActivityJobData>('activity-queue', activityFunction, {
  connection: createRedisConnection(),
  concurrency: 2,
});

(async () => {
  try {
    await activityWorker.waitUntilReady();
    logger.info('Activity worker connected to Redis');
  } catch (err) {
    logger.error({ err }, 'Activity worker could not connect to Redis');
    process.exit(1);
  }
})();

activityWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, action: job.data.action }, 'Activity job completed');
});

activityWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Activity job failed');
});
