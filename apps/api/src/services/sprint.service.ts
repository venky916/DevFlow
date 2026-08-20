// services/sprint.service.ts
import { sprintRepository } from '../repositories/sprint.repository';
import { activityService } from './activity.service';
import { notificationService } from './notification.service';
import { sprintEventsService } from './sprint-events.service';
import { ApiError } from '../lib/ApiError';

export const sprintService ={
    async startSprint(sprintId: string, userId: string) {
        const sprint = await sprintRepository.findById(sprintId);
        if (!sprint) throw ApiError.notFound('Sprint not found');
        if (sprint.status === 'ACTIVE') throw ApiError.badRequest('Sprint is already active');
        if (sprint.status === 'COMPLETED') throw ApiError.badRequest('Sprint is already completed');

        const activeSprint = await sprintRepository.findActiveSprintInProject(sprint.projectId);
        if (activeSprint) throw ApiError.badRequest('A sprint is already active in this project — complete it first');

        const updated = await sprintRepository.activate(sprintId, sprint.startDate ?? new Date());

        await sprintEventsService.invalidateBoardCache(sprint.projectId, sprintId);
        await activityService.logSprintStarted(sprintId, sprint.name, sprint.projectId, userId);

        const members = await sprintRepository.findProjectMemberIds(sprint.projectId);
        await notificationService.notifySprintStarted(
            members.map((m) => m.userId),
            sprintId,
            sprint.name,
            sprint.projectId,
            userId
        );

        await sprintEventsService.publishStarted(sprint.projectId, sprintId, sprint.name);

        return updated;
    },

    async completeSprint(sprintId: string, userId: string) {
        const sprint = await sprintRepository.findByIdWithIssues(sprintId);
        if (!sprint) throw ApiError.notFound('Sprint not found');
        if (sprint.status === 'COMPLETED') throw ApiError.badRequest('Sprint is already completed');

        await sprintRepository.complete(sprintId, sprint.endDate ?? new Date());

        await sprintEventsService.invalidateBoardCache(sprint.projectId, sprintId);

        const doneCount = sprint.issues.filter((i) => i.status === 'DONE').length;
        const incompleteCount = sprint.issues.filter((i) => i.status !== 'DONE').length;

        await activityService.logSprintCompleted(sprintId, sprint.projectId, userId, doneCount, incompleteCount);

        const members = await sprintRepository.findProjectMemberIds(sprint.projectId);
        await notificationService.notifySprintCompleted(
            members.map((m) => m.userId),
            sprintId,
            sprint.name,
            sprint.projectId,
            userId,
            doneCount,
            incompleteCount
        );

        await sprintEventsService.publishCompleted(sprint.projectId, sprintId, doneCount, incompleteCount);

        return { sprintId, incompleteCount, doneCount };
    },
}