// services/issue.service.ts
import { issueRepository } from '../repositories/issue.repository';
import { activityService } from './activity.service';
import { notificationService } from './notification.service';
import { issueEventsService } from './issue-events.service';
import { buildUpdateData } from '../lib/updateBuilder';
import { ApiError } from '../lib/ApiError';
import { IssueStatus } from '@devflow/db';

export const issueService = {
    async createIssue(projectId: string, creatorId: string, input: any) {
        const { title, description, priority, type, assigneeId, sprintId, parentId, dueDate, labelIds, status, attachments } = input;

        if (assigneeId) {
            const member = await issueRepository.findProjectMember(projectId, assigneeId);
            if (!member) throw ApiError.badRequest('Assignee is not a member of this project');
        }

        if (parentId) {
            const parent = await issueRepository.findById(parentId);
            if (!parent) throw ApiError.badRequest('Parent issue not found');
            if (parent.parentId) throw ApiError.badRequest('Parent issue is already a child of another issue');
            if (parent.projectId !== projectId) throw ApiError.badRequest('Parent must be in same project');
        }

        if (sprintId) {
            const sprint = await issueRepository.findSprint(sprintId);
            if (!sprint) throw ApiError.notFound('Sprint not found');
            if (sprint.status === 'COMPLETED') throw ApiError.badRequest('Cannot add issue to a completed sprint');
        }

        const position = await issueRepository.getNextPosition(projectId, sprintId ?? null);

        const issue = await issueRepository.createIssue(
            projectId, creatorId,
            { title, description, priority: priority ?? 'NO_PRIORITY', type: type ?? 'TASK', status: status ?? 'BACKLOG', dueDate: dueDate ?? null, parentId: parentId ?? null, assigneeId, sprintId: sprintId ?? null },
            position, labelIds, attachments
        );
        if (!issue) throw ApiError.internal('Failed to create issue');

        await issueEventsService.invalidateBoardCache(projectId, issue.sprintId ?? null);
        await activityService.logIssueCreated(issue.id, projectId, creatorId, issue.title);
        if (assigneeId) await notificationService.notifyIssueAssigned(assigneeId, creatorId, issue.id, title, projectId);
        await issueEventsService.publishCreated(projectId, issue);

        return issue;
    },

    async updateIssue(issueId: string, projectId: string, userId: string, input: any, canAssignAnyone: boolean, isLeadOrAdmin: boolean) {
        const { title, description, status, assigneeId, priority, type, dueDate, parentId, labelIds } = input;

        const issue = await issueRepository.findById(issueId);
        if (!issue) throw ApiError.notFound('Issue not found');

        if (assigneeId) {
            const member = await issueRepository.findProjectMember(projectId, assigneeId);
            if (!member) throw ApiError.badRequest('Assignee is not a member of this project');
            if (!canAssignAnyone && assigneeId !== userId) throw ApiError.forbidden('You can only assign issues to yourself');
        }

        if (parentId !== undefined) {
            if (!isLeadOrAdmin) throw ApiError.forbidden("Only leads or admins can change an issue's parent");
            if (parentId) {
                if (parentId === issueId) throw ApiError.badRequest('Issue cannot be its own parent');
                const parent = await issueRepository.findById(parentId);
                if (!parent) throw ApiError.badRequest('Parent issue not found');
                if (parent.parentId) throw ApiError.badRequest('Cannot nest more than 1 level deep in parent-child relationship');
                if (parent.projectId !== issue.projectId) throw ApiError.badRequest('Parent must be in same project');
                const childCount = await issueRepository.countChildren(issueId);
                if (childCount > 0) throw ApiError.badRequest('Cannot set a parent — this issue already has sub-issues');
            }
        }

        const updated = await issueRepository.updateIssue(
            issueId,
            buildUpdateData({ title, description, status, assigneeId, priority, type, dueDate, parentId }),
            labelIds
        );
        if (!updated) throw ApiError.internal('Failed to update issue');

        await issueEventsService.invalidateBoardCache(updated.projectId, updated.sprintId ?? null);
        await activityService.logIssueUpdated(issueId, updated.projectId, userId, { title, description, priority, type, assigneeId, status, dueDate });

        if (assigneeId && assigneeId !== issue.assigneeId) {
            await notificationService.notifyIssueAssigned(assigneeId, userId, issue.id, updated.title, updated.projectId);
        }

        await issueEventsService.publishUpdated(issue.projectId, issueId, { title, description, status, assigneeId, priority, type });

        return updated;
    },

    async moveIssue(issueId: string, userId: string, status: string, position: string) {
        const issue = await issueRepository.findById(issueId);
        if (!issue) throw ApiError.notFound('Issue not found');

        const updated = await issueRepository.moveIssue(issueId, status, position);

        await activityService.logIssueStatusChanged(issueId, updated.projectId, userId, issue.status, status);
        await issueEventsService.publishMoved(updated.projectId, issueId, status, position);

        const sprintIds = [issue.sprintId ?? null];
        if (issue.sprintId !== updated.sprintId) sprintIds.push(updated.sprintId ?? null);
        await issueEventsService.invalidateBoardCaches(updated.projectId, sprintIds);

        return updated;
    },

    async moveIssueToSprint(issueId: string, sprintId: string | null, position: string | undefined) {
        const issue = await issueRepository.findById(issueId);
        if (!issue) throw ApiError.notFound('Issue not found');

        let targetSprint = null;
        let newStatus = issue.status;

        if (sprintId) {
            targetSprint = await issueRepository.findSprint(sprintId);
            if (!targetSprint) throw ApiError.notFound('Sprint not found');
            if (targetSprint.status === 'COMPLETED') throw ApiError.badRequest('Cannot move issue to completed sprint');
            if (targetSprint.status === 'ACTIVE' && issue.status === 'BACKLOG') newStatus = 'TODO';
        }

        await issueRepository.moveToSprint(issueId, sprintId ?? null, newStatus as IssueStatus, position, targetSprint?.status);

        await issueEventsService.invalidateBoardCaches(issue.projectId, [issue.sprintId ?? null, sprintId ?? null]);

        return { message: 'Issue moved to sprint successfully' };
    },

    async createSubIssue(parentId: string, creatorId: string, userId: string, input: any) {
        const { title, description, priority, type, assigneeId, dueDate, labelIds } = input;

        const parent = await issueRepository.findById(parentId);
        if (!parent) throw ApiError.notFound('Parent issue not found');
        if (parent.parentId) throw ApiError.badRequest('Cannot nest more than 1 level deep');
        if (parent.status === 'DONE') throw ApiError.badRequest('Cannot add sub-issue to completed issue');

        if (assigneeId) {
            const member = await issueRepository.findProjectMember(parent.projectId, assigneeId);
            if (!member) throw ApiError.notFound('Assignee is not a member of this project');
        }

        let initialStatus: IssueStatus = 'BACKLOG';
        if (parent.sprintId) {
            const parentSprint = await issueRepository.findSprint(parent.sprintId);
            if (parentSprint?.status === 'COMPLETED') throw ApiError.badRequest('Cannot add sub-issue to completed sprint');
            if (parentSprint?.status === 'ACTIVE') initialStatus = 'TODO';
        }

        const position = await issueRepository.getNextPosition(parent.projectId, null, parentId);

        const subIssue = await issueRepository.createSubIssue(
            parentId, parent.projectId, parent.sprintId ?? null, creatorId,
            { title, description, priority: priority ?? 'NO_PRIORITY', type: type ?? 'TASK', dueDate: dueDate ?? null, assigneeId },
            initialStatus, position, labelIds
        );
        if (!subIssue) throw ApiError.internal('Failed to create sub issue');

        await activityService.logIssueCreated(subIssue.id, parent.projectId, creatorId, subIssue.title);
        if (assigneeId) await notificationService.notifyIssueAssigned(assigneeId, userId, subIssue.id, subIssue.title, subIssue.projectId);
        await issueEventsService.publishCreated(parent.projectId, { issueId: subIssue.id });

        return subIssue;
    },

    async attachChildIssue(parentId: string, childId: string, userId: string) {
        if (childId === parentId) throw ApiError.badRequest('Issue cannot be its own parent');

        const parent = await issueRepository.findById(parentId);
        if (!parent) throw ApiError.notFound('Parent issue not found');
        if (parent.parentId) throw ApiError.badRequest('Cannot nest more than 1 level deep in parent-child relationship');

        const child = await issueRepository.findById(childId);
        if (!child) throw ApiError.notFound('Child issue to attach not found');
        if (child.projectId !== parent.projectId) throw ApiError.badRequest('Issue must be in same project');
        if (child.parentId) throw ApiError.badRequest('Issue already has a parent');

        const childHasChildren = await issueRepository.countChildren(childId);
        if (childHasChildren > 0) throw ApiError.badRequest('Cannot attach — this issue already has its own sub-issues');

        const updated = await issueRepository.attachChild(parentId, childId, parent.sprintId ?? null);

        await issueEventsService.invalidateBoardCache(parent.projectId, parent.sprintId ?? null);
        await activityService.logIssueUpdated(childId, parent.projectId, userId, { attachedToParent: parentId });
        await issueEventsService.publishUpdated(parent.projectId, childId, { parentId });

        return updated;
    },

    async detachChildIssue(parentId: string, childId: string, userId: string) {
        const child = await issueRepository.findById(childId);
        if (!child) throw ApiError.notFound('Child issue not found');
        if (child.parentId !== parentId) throw ApiError.badRequest('Issue is not a child of this parent');

        const updated = await issueRepository.detachChild(parentId, childId);

        await issueEventsService.invalidateBoardCache(child.projectId, child.sprintId ?? null);
        await activityService.logIssueUpdated(childId, child.projectId, userId, { detachedFromParent: parentId });
        await issueEventsService.publishUpdated(child.projectId, childId, { parentId: null });

        return updated;
    },

    async deleteIssue(issueId: string, userId: string) {
        const issue = await issueRepository.findById(issueId);
        if (!issue) throw ApiError.notFound('Issue not found');

        const childCount = await issueRepository.countChildren(issueId);
        if (childCount > 0) throw ApiError.badRequest('Delete all sub-issues before deleting this issue');

        await issueRepository.delete(issueId);

        if (issue.parentId) {
            // syncParentStatus needs a tx-like client — pass prisma directly here since there's no active transaction
            await issueRepository.syncParentStatus(issue.parentId, issueRepository); // NOTE: see caveat below
        }

        await issueEventsService.invalidateBoardCache(issue.projectId, issue.sprintId ?? null);
        await activityService.logIssueDeleted(issueId, issue.projectId, userId, issue.title);
        await issueEventsService.publishDeleted(issue.projectId, issueId);
    },
};