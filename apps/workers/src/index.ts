import 'dotenv/config';

import { logger } from '@devflow/backend-common';

import { activityWorker } from './workers/activity.worker';
import { emailWorker } from './workers/email.worker';
import { fileCleanupWorker } from './workers/file-cleanup.worker';
import { notificationWorker } from './workers/notification.worker';

logger.info('Workers started: activity, notification, email, file cleanup');

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
