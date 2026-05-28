import { Queue } from "bullmq";
import { connection } from "./connection";
import { NotificationTypes } from "@devflow/types";

export type EmailType =typeof NotificationTypes[keyof typeof NotificationTypes];

// ─── Job data type ────────────────────────────────────────────────
export interface EmailJobData {
    to: string;               // recipient email
    type: EmailType;
    data: Record<string, any>; // template specific data
    // examples:
    // ISSUE_ASSIGNED: { issueTitle, projectName, assignedBy, issueLink }
    // WORKSPACE_INVITE: { workspaceName, invitedBy, inviteLink }
    // SPRINT_STARTED: { sprintName, projectName, issueCount }
}

export const emailQueue = new Queue<EmailJobData>('email-queue', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 30000, // wait 30s before retry (email sending)
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});