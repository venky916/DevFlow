import 'dotenv/config';

import { logger, registerGracefulShutdown } from '@devflow/backend-common';

import { activityWorker } from './workers/activity.worker';
import { emailWorker } from './workers/email.worker';
import { fileCleanupWorker } from './workers/file-cleanup.worker';
import { notificationWorker } from './workers/notification.worker';
import { startHeartbeat } from './heartbeat';

logger.info('Workers started: activity, notification, email, file cleanup');

// pings Better Stack while the workers are alive (off when HEARTBEAT_URL is empty)
const stopHeartbeat = startHeartbeat([
  activityWorker,
  notificationWorker,
  emailWorker,
  fileCleanupWorker,
]);


registerGracefulShutdown(async () => {
  stopHeartbeat();
  await Promise.all([
    activityWorker.close(),
    notificationWorker.close(),
    emailWorker.close(),
    fileCleanupWorker.close(),
  ]);
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down workers');
  await Promise.all([
    activityWorker.close(),
    notificationWorker.close(),
    emailWorker.close(),
    fileCleanupWorker.close(),
  ]);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
