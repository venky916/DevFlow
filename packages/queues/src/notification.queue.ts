import { Queue } from "bullmq";
import { connection } from "./connection";


export type NotificationType = | 'ISSUE_ASSIGNED'
    | 'ISSUE_COMMENTED'
    | 'SPRINT_STARTED'
    | 'SPRINT_COMPLETED'
    | 'WORKSPACE_INVITED'
    | 'PROJECT_ADDED';

// ─── Job data type ────────────────────────────────────────────────
export interface NotificationJobData {
    userId: string;           // who receives the notification
    type: NotificationType;
    content: string;          // e.g. "Ravi assigned you to Fix login bug"
    link?: string;            // e.g. "/projects/abc/issues/xyz"
    triggeredBy: string;      // userId of who triggered it
}


export const notificationQueue = new Queue<NotificationJobData>('notification-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});