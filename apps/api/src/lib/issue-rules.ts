import { generateKeyBetween } from 'fractional-indexing';

import type { IssueStatus } from '@devflow/types';

export interface IssueActor {
  userId: string;
  isLead: boolean; // project LEAD or workspace admin
}

export function getIssueActor(
  userId: string,
  access: { isWorkspaceAdmin: boolean; projectRole: string | null },
): IssueActor {
  return { userId, isLead: access.isWorkspaceAdmin || access.projectRole === 'LEAD' };
}

// positions are fractional-indexing keys. A bad key makes generateKeyBetween throw
// for every later issue in that column, so keys are checked before they are stored.
export function isValidPosition(position: string): boolean {
  try {
    generateKeyBetween(position, null);
    return true;
  } catch {
    return false;
  }
}

// A parent's status follows its sub-issues:
//   all Done            -> Done
//   all Backlog         -> Backlog (Todo when the parent is in the active sprint)
//   only Backlog / Todo -> Todo
//   anything else       -> In Progress
export function deriveParentStatus(
  childStatuses: IssueStatus[],
  inActiveSprint: boolean,
): IssueStatus {
  if (childStatuses.every((s) => s === 'DONE')) return 'DONE';
  if (childStatuses.every((s) => s === 'BACKLOG')) return inActiveSprint ? 'TODO' : 'BACKLOG';
  if (childStatuses.every((s) => s === 'BACKLOG' || s === 'TODO')) return 'TODO';
  return 'IN_PROGRESS';
}
