import { activityQueue } from "@devflow/queues";

interface LogActivityInput {
    action: string;
    scope: "ISSUE" | "PROJECT";
    userId: string;
    projectId: string;
    issueId?: string;
    meta?: Record<string, any>;
}

export async function logActivity(input: LogActivityInput) {
    await activityQueue.add("activity", {
        action: input.action,
        scope: input.scope,
        userId: input.userId,
        projectId: input.projectId,
        issueId: input.issueId,
        meta: input.meta ?? {},
    });
}
