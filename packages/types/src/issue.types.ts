import type { IProjectLabel } from './project.types';
import type { ISprint, SprintStatus } from './sprint.types';
import type { IUserSummary } from './user.types';

export type IssueStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
// the four board columns. Backlog issues are not in a sprint, so they never sit on the board
export type BoardStatus = Exclude<IssueStatus, 'BACKLOG'>;
export type IssuePriority = 'NO_PRIORITY' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IssueType = 'BUG' | 'TASK' | 'FEATURE' | 'IMPROVEMENT' | 'OTHER';

// dueDate stays an ISO string until the date pass (then YYYY-MM-DD)
export interface IIssue {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  position: string;
  type: IssueType;
  dueDate: string | null;
  parentId: string | null;
  projectId: string;
  sprintId: string | null;
  assigneeId: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IIssueChild {
  id: string;
  title: string;
  status: IssueStatus;
  assigneeId: string | null;
  assignee: IUserSummary | null;
}

// board card, list row and backlog row
export interface IIssueCard extends IIssue {
  assignee: IUserSummary | null;
  creator: IUserSummary;
  labels: IProjectLabel[];
  children: IIssueChild[];
}

export interface IIssueParent {
  id: string;
  title: string;
  status: IssueStatus;
  type: IssueType;
  priority: IssuePriority;
}

export interface IIssueChildDetail extends IIssueChild {
  type: IssueType;
  priority: IssuePriority;
}

// GET /issues/:id (slideover and detail page)
export interface IIssueDetail extends IIssue {
  assignee: IUserSummary | null;
  creator: IUserSummary;
  labels: IProjectLabel[];
  project: IIssueProject;
  sprint: { id: string; name: string; status: SprintStatus } | null;
  parent: IIssueParent | null;
  children: IIssueChildDetail[];
}

// my issues board and list
export interface IMyIssue extends IIssueCard {
  project: IIssueProject;
  sprint: { id: string; name: string; status: SprintStatus } | null;
  parent: { id: string; title: string } | null;
}

export type BoardColumns = Record<BoardStatus, IIssueCard[]>;

// GET /projects/:id/issues/board
export interface IBoard {
  activeSprint: ISprint | null;
  columns: BoardColumns;
}

// GET /projects/:id/issues/backlog/grouped
export interface IBacklogGrouped {
  sprints: (ISprint & { issues: IIssueCard[] })[];
  backlogIssues: IIssueCard[];
}

// GET /users/my-issues/board
export interface IMyIssuesBoard {
  columns: Record<IssueStatus, IMyIssue[]>;
}

// GET /projects/:id/issues/search
export interface IIssueSearchResult {
  id: string;
  title: string;
  status: IssueStatus;
  type: IssueType;
  priority: IssuePriority;
}

export interface IIssueProject {
  id: string;
  name: string;
  slug: string;
  workspace: { id: string; slug: string };
}

// GET /users/my-issues/projects
export interface IMyIssuesProject {
  id: string;
  name: string;
  slug: string;
  workspace: { id: string; name: string; slug: string };
}

export type ActivityScope = 'ISSUE' | 'PROJECT';

export interface IActivityLog {
  id: string;
  action: string;
  scope: ActivityScope;
  meta: Record<string, unknown> | null;
  userId: string;
  issueId: string | null;
  projectId: string;
  createdAt: string;
  user?: IUserSummary | null;
  issue?: { id: string; title: string } | null;
}