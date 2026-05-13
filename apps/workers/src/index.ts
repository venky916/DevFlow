import "dotenv/config";
import { logger } from "@devflow/backend-common";
import { activityWorker } from "./workers/activity.worker";
import { emailWorker } from "./workers/email.worker";
import { notificationWorker } from "./workers/notification.worker";

logger.info('🚀 Workers starting...');
logger.info('✅ Activity worker started');
logger.info('✅ Notification worker started');
logger.info('✅ Email worker started');

process.on("SIGTERM", async () => {
    logger.info('Shutting down workers...');
    await activityWorker.close();
    await notificationWorker.close();
    await emailWorker.close();
    process.exit(0);
})