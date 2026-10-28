'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { BoardStatus, IIssueDetail } from '@devflow/types';
import {
  updateIssueSchema,
  type UpdateIssueInput,
  type UpdateIssueOutput,
} from '@devflow/validators';

import { BOARD_STATUS_OPTIONS, STATUS_OPTIONS } from '../../lib/issue-constants';
import { isStatusLocked } from '../../lib/issue-rules';
import { displayName } from '../../lib/roles';
import { useMoveIssue } from '../use-board';
import { useIssueAccess } from '../use-issue-access';
import { useUpdateIssue } from '../use-issues';
import { useProjectMembers } from '../use-projects';

function toFormValues(issue: IIssueDetail): UpdateIssueInput {
  return {
    title: issue.title,
    description: issue.description ?? '',
    priority: issue.priority,
    type: issue.type,
    assigneeId: issue.assigneeId,
    dueDate: issue.dueDate,
    labelIds: issue.labels.map((l) => l.id),
  };
}

const sameText = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? '') === (b ?? '');

// Only the fields that really differ from what is saved. A field the user can't change
// (a due date for a developer) is never sent unless it changed.
function buildChanges(issue: IIssueDetail, data: UpdateIssueOutput): UpdateIssueInput {
  const changes: UpdateIssueInput = {};

  if (data.title !== undefined && data.title !== issue.title) changes.title = data.title;
  if (data.description !== undefined && !sameText(data.description, issue.description)) {
    changes.description = data.description;
  }
  if (data.priority && data.priority !== issue.priority) changes.priority = data.priority;
  if (data.type && data.type !== issue.type) changes.type = data.type;
  if (data.assigneeId !== undefined && (data.assigneeId ?? null) !== issue.assigneeId) {
    changes.assigneeId = data.assigneeId;
  }
  if (data.dueDate !== undefined) {
    const next = data.dueDate ? data.dueDate.toISOString() : null;
    if (next !== issue.dueDate) changes.dueDate = data.dueDate;
  }
  if (data.labelIds) {
    const next = [...data.labelIds].sort().join();
    const current = issue.labels
      .map((l) => l.id)
      .sort()
      .join();
    if (next !== current) changes.labelIds = data.labelIds;
  }

  return changes;
}

export type IssueFormState = ReturnType<typeof useIssueForm>;

export function useIssueForm(
  issue: IIssueDetail,
  projectId: string,
  projectContext: { workspaceSlug: string; projectSlug: string },
) {
  const { mutate: updateIssue, isPending: isUpdating } = useUpdateIssue(issue.id);
  const { mutate: moveIssue, isPending: isMoving } = useMoveIssue();
  const { data: members } = useProjectMembers(projectId);
  const { userId, canMove, canAssignAnyone, canEditDueDate } = useIssueAccess(projectContext);

  const form = useForm<UpdateIssueInput, unknown, UpdateIssueOutput>({
    resolver: zodResolver(updateIssueSchema),
    // follows the saved issue, but a field the user has already changed keeps their value,
    // so a refresh never wipes what is being typed
    values: toFormValues(issue),
    resetOptions: { keepDirtyValues: true },
  });

  const submit = form.handleSubmit(
    (data) => {
      const changes = buildChanges(issue, data);
      if (Object.keys(changes).length === 0) return;
      updateIssue(changes, { onError: () => form.reset(toFormValues(issue)) });
    },
    // invalid (an empty title, for example): go back to the saved values
    () => form.reset(toFormValues(issue)),
  );
  const save = () => {
    void submit();
  };

  // change a field and save it right away
  const setField = <K extends keyof UpdateIssueInput>(name: K, value: UpdateIssueInput[K]) => {
    form.setValue(name, value as never, { shouldDirty: true });
    save();
  };

  // lead or admin: any issue. Developer: only issues assigned to them.
  const canEditIssue = canMove({ assigneeId: issue.assigneeId });

  // status only exists inside the active sprint, and a parent's status follows its sub-issues
  const statusLocked = isStatusLocked(issue) || issue.sprint?.status !== 'ACTIVE';
  const canChangeStatus = canEditIssue && !statusLocked;
  const statusOptions = statusLocked ? STATUS_OPTIONS : BOARD_STATUS_OPTIONS;

  const changeStatus = (next: string) => {
    if (next === issue.status) return;
    moveIssue({ issueId: issue.id, data: { status: next as BoardStatus } });
  };

  // a developer can assign only themselves. The current assignee is always listed, so it shows.
  const people = members?.map((m) => ({ label: displayName(m.user), value: m.userId })) ?? [];
  const assignable = canAssignAnyone ? people : people.filter((p) => p.value === userId);
  const current = issue.assignee
    ? { label: displayName(issue.assignee), value: issue.assignee.id }
    : null;
  const memberOptions =
    current && !assignable.some((o) => o.value === current.value)
      ? [current, ...assignable]
      : assignable;

  return {
    ...form,
    save,
    setField,
    changeStatus,
    statusOptions,
    canChangeStatus,
    memberOptions,
    canEditIssue,
    canEditDueDate,
    isSaving: isUpdating || isMoving,
  };
}
