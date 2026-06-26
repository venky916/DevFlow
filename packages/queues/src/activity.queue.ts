import { Queue } from "bullmq";
import { createRedisConnection } from "./connection";
import { ActivityScope } from "@devflow/types";

// ─── Job data type ────────────────────────────────────────────────
export interface ActivityJobData {
    action: string;       // e.g. "ISSUE_STATUS_CHANGED"
    scope: ActivityScope;
    userId: string;       // who did the action
    projectId: string;    // which project
    issueId?: string;     // which issue (optional — some actions are project level)
    meta?: Record<string, any>; // extra data e.g. { from: "TODO", to: "IN_PROGRESS" }
}

export const activityQueue = new Queue<ActivityJobData>("activity-queue", {
    connection: createRedisConnection(),
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});