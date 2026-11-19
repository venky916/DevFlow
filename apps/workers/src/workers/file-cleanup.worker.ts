import { Job, Worker } from 'bullmq';

import { captureError, logger } from '@devflow/backend-common';
import { createRedisConnection, FileCleanupJobData, isFinalFailure, runJob } from '@devflow/queues';
import { deleteFile } from '@devflow/storage';

async function fileCleanupFunction(job: Job<FileCleanupJobData>) {
  const { fileKey } = job.data;
  logger.debug({ jobId: job.id, fileKey }, 'Processing file cleanup job');
  await deleteFile(fileKey);
  logger.info({ jobId: job.id, fileKey }, 'File deleted from storage');
}

export const fileCleanupWorker = new Worker<FileCleanupJobData>(
  'file-cleanup-queue',
  (job) => runJob(job, () => fileCleanupFunction(job)),
  { connection: createRedisConnection(), concurrency: 2 },
);

(async () => {
  try {
    await fileCleanupWorker.waitUntilReady();
    logger.info('File cleanup worker connected to Redis');
  } catch (err) {
    logger.error({ err }, 'File cleanup worker could not connect to Redis');
    process.exit(1);
  }
})();

fileCleanupWorker.on('failed', (job, err) => {
  runJob(job, () => {
    logger.error({ jobId: job?.id, err }, 'File cleanup job failed');
    if (isFinalFailure(job)) captureError(err, { queue: 'file-cleanup', jobId: job?.id });
  });
});
