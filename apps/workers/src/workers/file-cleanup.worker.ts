import { Job, Worker } from 'bullmq';

import { logger } from '@devflow/backend-common';
import { createRedisConnection, FileCleanupJobData } from '@devflow/queues';
import { deleteFile } from '@devflow/storage';

async function fileCleanupFunction(job: Job<FileCleanupJobData>) {
  const { fileKey } = job.data;
  logger.info({ jobId: job.id, fileKey }, 'Processing file cleanup job');
  await deleteFile(fileKey);
  logger.info({ jobId: job.id, fileKey }, '✅ Orphaned file deleted from B2');
}

export const fileCleanupWorker = new Worker<FileCleanupJobData>(
  'file-cleanup-queue',
  fileCleanupFunction,
  { connection: createRedisConnection(), concurrency: 2 },
);

(async () => {
  try {
    await fileCleanupWorker.waitUntilReady();
    logger.info('✅ File cleanup worker connected to Redis');
  } catch (error) {
    logger.error({ error }, '❌ File cleanup worker FAILED to connect to Redis');
    process.exit(1);
  }
})();

fileCleanupWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'File cleanup job completed');
});

// fileCleanupWorker.on("failed", (job, error) => {
//     logger.error({ jobId: job?.id, error }, "File cleanup job failed")
// })

fileCleanupWorker.on('failed', (job, error) => {
  logger.error(
    { jobId: job?.id, error: error?.message ?? String(error) },
    'File cleanup job failed',
  );
});
