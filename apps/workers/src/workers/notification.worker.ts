import { Job, Worker } from 'bullmq';

import { captureError, logger, publisher } from '@devflow/backend-common';
import { prisma } from '@devflow/db';
import {
  createRedisConnection,
  isFinalFailure,
  NotificationJobData,
  runJob,
} from '@devflow/queues';
import { UserEvents } from '@devflow/types';

async function notificationFunction(job: Job<NotificationJobData>) {
  const { userId, type, content, link, triggeredBy } = job.data;

  logger.debug({ jobId: job.id, type }, 'Processing notification job');

  // Step 1: write to the database (persists for offline users)
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      content,
      link: link ?? null,
      triggeredBy: triggeredBy ?? null,
      isRead: false,
    },
  });

  // Step 2: broadcast through Redis pub/sub. The ws server sends it live if the user is connected.
  await publisher.publish(
    `user:${userId}`,
    JSON.stringify({
      type: UserEvents.NOTIFICATION,
      payload: {
        id: notification.id,
        content,
        link,
        notificationType: type,
        triggeredBy,
        createdAt: notification.createdAt,
      },
    }),
  );
}

export const notificationWorker = new Worker<NotificationJobData>(
  'notification-queue',
  (job) => runJob(job, () => notificationFunction(job)),
  { connection: createRedisConnection(), concurrency: 2 },
);

(async () => {
  try {
    await notificationWorker.waitUntilReady();
    logger.info('Notification worker connected to Redis');
  } catch (err) {
    logger.error({ err }, 'Notification worker could not connect to Redis');
    process.exit(1);
  }
})();

notificationWorker.on('completed', (job) => {
  runJob(job, () =>
    logger.info({ jobId: job.id, type: job.data.type }, 'Notification job completed'),
  );
});

notificationWorker.on('failed', (job, err) => {
  runJob(job, () => {
    logger.error({ jobId: job?.id, err }, 'Notification job failed');
    if (isFinalFailure(job)) captureError(err, { queue: 'notification', jobId: job?.id });
  });
});
