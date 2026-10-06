// services/sprint-events.service.ts
import { ProjectEvents } from '@devflow/types';

import { CacheKeys, deleteCache } from '../lib/cache';
import { publishToProject } from '../lib/redis.publisher';

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

  publishCompleted(
    projectId: string,
    sprintId: string,
    doneCount: number,
    incompleteCount: number,
  ) {
    return publishToProject(projectId, {
      type: ProjectEvents.SPRINT_COMPLETED,
      payload: { sprintId, incompleteCount, doneCount },
    });
  },
};
