import { ROUTES } from '../constants/routes';

export const ISSUE_ORIGINS = ['board', 'backlog', 'my-issues'] as const;
export type IssueOrigin = (typeof ISSUE_ORIGINS)[number];

export const ISSUE_ORIGIN_LABELS: Record<IssueOrigin, string> = {
  board: 'Board',
  backlog: 'Backlog',
  'my-issues': 'My Issues',
};

export function parseIssueOrigin(value: string | null): IssueOrigin | null {
  return ISSUE_ORIGINS.find((origin) => origin === value) ?? null;
}

export function issueOriginHref(
  origin: IssueOrigin,
  workspaceSlug: string,
  projectSlug: string,
): string {
  switch (origin) {
    case 'my-issues':
      return ROUTES.myIssues;
    case 'backlog':
      return ROUTES.projectBacklog(workspaceSlug, projectSlug);
    case 'board':
      return ROUTES.projectBoard(workspaceSlug, projectSlug);
  }
}

// which list an issue was opened from, from the current page's path
export function issueOriginFromPath(pathname: string): IssueOrigin | null {
  if (pathname.includes('/backlog')) return 'backlog';
  if (pathname.includes('/board')) return 'board';
  if (pathname.includes('/my-issues')) return 'my-issues';
  return null;
}
