import { publisher } from "@devflow/backend-common"

export type RedisEvent = {
    type: string,
    payload: Record<string, any>
}

export const publishToProject = async (projectId: string, event: RedisEvent) => {
    await publisher.publish(`project:${projectId}`, JSON.stringify(event))
}

export const publishToIssue = async (issueId: string, event: RedisEvent) => {
    await publisher.publish(`issue:${issueId}`, JSON.stringify(event))
}