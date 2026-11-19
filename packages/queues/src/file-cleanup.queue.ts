import { createRedisConnection } from './connection';
import { createTracedQueue, type WithRequestId } from './traced-queue';

export interface FileCleanupJobData extends WithRequestId {
  fileKey: string;
}

export const fileCleanupQueue = createTracedQueue<FileCleanupJobData>('file-cleanup-queue', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
