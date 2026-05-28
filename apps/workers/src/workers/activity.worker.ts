import { Worker, Job } from "bullmq";
import { prisma } from "@devflow/db";
import { logger } from "@devflow/backend-common";
import { ActivityJobData, connection } from "@devflow/queues";

async function activityFunction(job: Job<ActivityJobData>) {
    const { action, userId, projectId, issueId, meta } = job.data;

    logger.info({ jobId: job.id, action }, "Processing activity job")

    await prisma.activityLog.create({
        data: {
            action,
            userId,
            projectId,
            issueId: issueId ?? null,
            meta
        }
    })

    logger.info({ jobId: job.id, action }, "Activity log written")

}
export const activityWorker = new Worker<ActivityJobData>("activity-queue", activityFunction, { connection, concurrency: 5 });

(async () => {
    try {
        await activityWorker.waitUntilReady()
        logger.info("✅ Activity worker connected to Redis")
    } catch (error) {
        logger.error({ error }, "❌ Activity worker FAILED to connect to Redis")
        process.exit(1)
    }
})()


activityWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Activity job completed")
})

activityWorker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, error }, "Activity job failed")
})