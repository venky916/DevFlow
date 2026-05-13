import { Worker, Job } from "bullmq";
import { prisma } from "@devflow/db";
import { logger, publisher } from "@devflow/backend-common";
import { NotificationJobData } from "@devflow/queues";
import { connection } from "../lib/redis";

async function notificationFunction(job: Job<NotificationJobData>) {
    const { userId, type, content, link, triggeredBy } = job.data;

    logger.info({ jobId: job.id, type }, "Processing notification job")

    // Step 1 — write to DB (persists for offline users)
    const notification = await prisma.notification.create({
        data: {
            userId,
            content
        }
    })

    logger.info({ jobId: job.id, type }, "Notification written")

    // Step 2 — broadcast via Redis pub/sub → WS server picks it up
    // WS server sends it live if user is connected
    await publisher.publish(
        `user:${userId}`,
        JSON.stringify({
            type: 'NOTIFICATION',
            payload: {
                id: notification.id,
                content,
                link,
                notificationType: type,
                triggeredBy,
                createdAt: notification.createdAt,
            },
        })
    )
    logger.info({ jobId: job.id, userId }, 'Notification sent');
}

export const notificationWorker = new Worker<NotificationJobData>("notification-queue", notificationFunction, { connection, concurrency: 5 });

notificationWorker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Notification job completed")
})

notificationWorker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, error }, "Notification job failed")
})