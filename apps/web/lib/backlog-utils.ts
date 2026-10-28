import type { IBacklogGrouped, IIssueCard, IssueStatus } from '@devflow/types';

import { byPosition } from './board-utils';

export const BACKLOG_ID = 'BACKLOG';

// which section (a sprint id, or BACKLOG) an issue is in
export function findIssueContainer(data: IBacklogGrouped, issueId: string): string | null {
  for (const sprint of data.sprints) {
    if (sprint.issues.some((i) => i.id === issueId)) return sprint.id;
  }
  return data.backlogIssues.some((i) => i.id === issueId) ? BACKLOG_ID : null;
}

export function listOf(data: IBacklogGrouped, containerId: string): IIssueCard[] {
  if (containerId === BACKLOG_ID) return data.backlogIssues;
  return data.sprints.find((s) => s.id === containerId)?.issues ?? [];
}

// the same status rule as the server
function statusAfterMove(status: IssueStatus, targetIsActive: boolean): IssueStatus {
  if (!targetIsActive) return 'BACKLOG';
  return status === 'BACKLOG' ? 'TODO' : status;
}

// The backlog as it will look after a move. Used for the instant update before the server answers.
// Without a position the issue goes to the end of its section, like the server does.
export function moveIssueInBacklog(
  data: IBacklogGrouped,
  issueId: string,
  targetId: string,
  position?: string,
): IBacklogGrouped {
  const from = findIssueContainer(data, issueId);
  const issue = from ? listOf(data, from).find((i) => i.id === issueId) : undefined;
  if (!from || !issue) return data;

  const targetSprint = targetId === BACKLOG_ID ? null : data.sprints.find((s) => s.id === targetId);
  if (targetId !== BACKLOG_ID && !targetSprint) return data;

  const moved: IIssueCard = {
    ...issue,
    sprintId: targetSprint?.id ?? null,
    status: statusAfterMove(issue.status, targetSprint?.status === 'ACTIVE'),
    position: position ?? issue.position,
  };

  const apply = (id: string, list: IIssueCard[]) => {
    if (id === targetId) {
      const next = [...list.filter((i) => i.id !== issueId), moved];
      return position ? next.sort(byPosition) : next;
    }
    if (id === from) return list.filter((i) => i.id !== issueId);
    return list;
  };

  return {
    sprints: data.sprints.map((s) => ({ ...s, issues: apply(s.id, s.issues) })),
    backlogIssues: apply(BACKLOG_ID, data.backlogIssues),
  };
}
