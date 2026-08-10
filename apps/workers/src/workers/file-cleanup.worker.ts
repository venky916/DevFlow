import { Worker, Job } from "bullmq";
import { deleteFileFromB2 } from "@devflow/storage";
import { logger } from "@devflow/backend-common";
import { FileCleanupJobData, createRedisConnection } from "@devflow/queues";

async function fileCleanupFunction(job: Job<FileCleanupJobData>) {
    const { fileKey } = job.data;
    logger.info({ jobId: job.id, fileKey }, "Processing file cleanup job")
    await deleteFileFromB2(fileKey)
    logger.info({ jobId: job.id, fileKey }, "✅ Orphaned file deleted from B2")
}

export const fileCleanupWorker = new Worker<FileCleanupJobData>("file-cleanup-queue", fileCleanupFunction, { connection: createRedisConnection(), concurrency: 2 });

(async () => {
    try {
        await fileCleanupWorker.waitUntilReady()
        logger.info("✅ File cleanup worker connected to Redis")
    } catch (error) {
        logger.error({ error }, "❌ File cleanup worker FAILED to connect to Redis")
        process.exit(1)
    }
})()

fileCleanupWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "File cleanup job completed")
})

// fileCleanupWorker.on("failed", (job, error) => {
//     logger.error({ jobId: job?.id, error }, "File cleanup job failed")
// })

fileCleanupWorker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, error: error?.message ?? String(error) }, "File cleanup job failed")
})