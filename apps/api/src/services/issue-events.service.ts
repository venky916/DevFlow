// services/issue-events.service.ts
import { deleteCache, deleteManyCache, CacheKeys } from '../lib/cache';
import { publishToProject } from '../lib/redis.publisher';
import { ProjectEvents } from '@devflow/types';

export const issueEventsService = {
    invalidateBoardCache(projectId: string, sprintId: string | null) {
        return deleteCache(CacheKeys.board(projectId, sprintId));
    },

    invalidateBoardCaches(projectId: string, sprintIds: (string | null)[]) {
        return deleteManyCache(sprintIds.map((sid) => CacheKeys.board(projectId, sid)));
    },

    publishCreated(projectId: string, issue: any) {
        return publishToProject(projectId, { type: ProjectEvents.ISSUE_CREATED, payload: { issue } });
    },

    publishUpdated(projectId: string, issueId: string, changes: Record<string, any>) {
        return publishToProject(projectId, { type: ProjectEvents.ISSUE_UPDATED, payload: { issueId, changes } });
    },

    publishMoved(projectId: string, issueId: string, newStatus: string, newPosition: string) {
        return publishToProject(projectId, { type: ProjectEvents.ISSUE_MOVED, payload: { issueId, newStatus, newPosition } });
    },

    publishDeleted(projectId: string, issueId: string) {
        return publishToProject(projectId, { type: ProjectEvents.ISSUE_DELETED, payload: { issueId } });
    },
};