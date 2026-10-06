'use client';

import { canMoveIssue, canProject } from '../lib/permissions';
import { useAuthStore } from '../stores/auth.store';
import { usePermissions } from './use-permissions';

export function useCanMoveIssue(override?: { workspaceSlug?: string; projectSlug?: string }) {
  const { access } = usePermissions(override);
  const userId = useAuthStore((s) => s.user?.id);

  return {
    canMove: (issue: { assigneeId: string | null }) =>
      !!userId && canMoveIssue(access, issue, userId),
    // cross-section move (backlog ↔ sprint): Lead/Admin only, regardless of assignment
    canCreateIssue: canProject(access, 'CREATE_ISSUE'),
    canDeleteIssue: canProject(access, 'DELETE_ISSUE'),
    canStartSprint: canProject(access, 'START_SPRINT'),
    canMoveToSprint: canProject(access, 'MOVE_ISSUE_TO_SPRINT'),
    canEditDueDate: canProject(access, 'UPDATE_DUE_DATE'),
  };
}
