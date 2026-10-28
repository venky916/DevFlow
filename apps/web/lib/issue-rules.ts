import type { IssueStatus } from '@devflow/types';

// A card's status can't be changed by hand when it is in the Backlog (status only exists inside
// the active sprint) or when it has sub-issues (their statuses decide it).
// Sub-issue rows have no `children`, hence the `?.`.
export function isStatusLocked(issue: { status: IssueStatus; children?: unknown[] }): boolean {
  return issue.status === 'BACKLOG' || (issue.children?.length ?? 0) > 0;
}
