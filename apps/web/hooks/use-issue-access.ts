'use client';

import { canMoveIssue, canProject } from '../lib/permissions';
import { useAuthStore } from '../stores/auth.store';
import { usePermissions } from './use-permissions';

// `override` is for lists that mix projects (my issues): each row names its own project.
export function useIssueAccess(override?: { workspaceSlug?: string; projectSlug?: string }) {
  const { access } = usePermissions(override);
  const userId = useAuthStore((s) => s.user?.id) ?? null;

  return {
    userId,
    isLead: access.isWorkspaceAdmin || access.projectRole === 'LEAD',
    // lead or admin: any issue. Developer: only issues assigned to them.
    canMove: (issue: { assigneeId: string | null }) =>
      !!userId && canMoveIssue(access, issue, userId),
    canAssignAnyone: canProject(access, 'ASSIGN_ANY_ISSUE'),
    canCreateIssue: canProject(access, 'CREATE_ISSUE'),
    canDeleteIssue: canProject(access, 'DELETE_ISSUE'),
    canStartSprint: canProject(access, 'START_SPRINT'),
    canMoveToSprint: canProject(access, 'MOVE_ISSUE_TO_SPRINT'),
    canEditDueDate: canProject(access, 'UPDATE_DUE_DATE'),
    canCreateSubIssue: canProject(access, 'CREATE_SUB_ISSUE'),
    canAttachChild: canProject(access, 'ATTACH_CHILD_ISSUE'),
    canDetachChild: canProject(access, 'DETACH_CHILD_ISSUE'),
  };
}
