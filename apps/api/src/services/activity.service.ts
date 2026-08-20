// services/activity.service.ts
import { logActivity } from '../lib/logActivity';
import { ActivityActions } from '@devflow/types';

export const activityService = {
    logSprintStarted(sprintId: string, sprintName: string, projectId: string, userId: string) {
        return logActivity({
            action: ActivityActions.SPRINT_STARTED,
            scope: 'PROJECT',
            userId,
            projectId,
            meta: { sprintId, sprintName },
        });
    },

    logSprintCompleted(sprintId: string, projectId: string, userId: string, doneCount: number, incompleteCount: number) {
        return logActivity({
            action: ActivityActions.SPRINT_COMPLETED,
            scope: 'PROJECT',
            userId,
            projectId,
            meta: { sprintId, doneCount, incompleteCount },
        });
    },

    logMemberAdded(projectId: string, requesterId: string, addedUserId: string, role: string) {
        return logActivity({
            action: ActivityActions.MEMBER_ADDED,
            scope: 'PROJECT',
            userId: requesterId,
            projectId,
            meta: { addedUserId, role },
        });
    },

    logCommentAdded(issueId: string, projectId: string, userId: string, commentId: string, preview: string) {
        return logActivity({
            action: ActivityActions.COMMENT_ADDED,
            scope: 'ISSUE',
            userId,
            projectId,
            issueId,
            meta: { commentId, preview: preview.slice(0, 100) },
        });
    },

    logIssueCreated(issueId: string, projectId: string, userId: string, title: string) {
        return logActivity({ action: ActivityActions.ISSUE_CREATED, scope: 'ISSUE', userId, projectId, issueId, meta: { title } });
    },

    logIssueUpdated(issueId: string, projectId: string, userId: string, changes: Record<string, any>) {
        return logActivity({ action: ActivityActions.ISSUE_UPDATED, scope: 'ISSUE', userId, projectId, issueId, meta: { changes } });
    },

    logIssueStatusChanged(issueId: string, projectId: string, userId: string, from: string, to: string) {
        return logActivity({ action: ActivityActions.ISSUE_STATUS_CHANGED, scope: 'ISSUE', userId, projectId, issueId, meta: { from, to } });
    },

    logIssueDeleted(issueId: string, projectId: string, userId: string, title: string) {
        return logActivity({ action: ActivityActions.ISSUE_DELETED, scope: 'ISSUE', userId, projectId, issueId, meta: { title } });
    },
}