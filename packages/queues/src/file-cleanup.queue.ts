import { Queue } from "bullmq";
import { createRedisConnection } from "./connection";

export interface FileCleanupJobData {
    fileKey: string;
}

export const fileCleanupQueue = new Queue<FileCleanupJobData>('file-cleanup-queue', {
    connection: createRedisConnection(),
    defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: true,
        removeOnFail: false
    }
});