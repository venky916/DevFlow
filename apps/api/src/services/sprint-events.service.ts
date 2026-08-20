// services/sprint-events.service.ts
import { deleteCache, CacheKeys } from '../lib/cache';
import { publishToProject } from '../lib/redis.publisher';
import { ProjectEvents } from '@devflow/types';

export const sprintEventsService = {
    invalidateBoardCache(projectId: string, sprintId: string) {
        return deleteCache(CacheKeys.board(projectId, sprintId));
    },

    publishStarted(projectId: string, sprintId: string, sprintName: string) {
        return publishToProject(projectId, {
            type: ProjectEvents.SPRINT_STARTED,
            payload: { sprintId, name: sprintName },
        });
    },

    publishCompleted(projectId: string, sprintId: string, doneCount: number, incompleteCount: number) {
        return publishToProject(projectId, {
            type: ProjectEvents.SPRINT_COMPLETED,
            payload: { sprintId, incompleteCount, doneCount },
        });
    },
}