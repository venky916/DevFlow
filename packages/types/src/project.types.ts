import type { IssueStatus, IssueType } from './issue.types';
import { SprintStatus } from './sprint.types';
import type { IUserPublic } from './user.types';

export type ProjectRole = 'LEAD' | 'DEVELOPER' | 'VIEWER';

// Resolved on the server. Workspace admins have no project role and pass every check.
export interface IProjectAccess {
  isWorkspaceAdmin: boolean;
  projectRole: ProjectRole | null;
}

export interface IProject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface IProjectMemberWithUser extends IProjectMember {
  user: IUserPublic;
}

export interface IProjectLabel {
  id: string;
  name: string;
  color: string;
  projectId: string;
  createdAt: string;
}

export interface IProjectSummary extends IProject {
  _count: { issues: number; sprints: number; members: number };
  currentUserAccess: IProjectAccess;
}

// GET /projects/:id (the heavy one)
export interface IProjectDetail extends IProjectSummary {
  members: IProjectMemberListItem[];
  sprints: {
    id: string;
    name: string;
    status: SprintStatus;
    createdAt: string;
    _count: { issues: number };
    issues: string[]; // ids of DONE issues, per getProjectById
  }[];
}

// GET /projects/:id/members
export interface IProjectMemberListItem extends IProjectMemberWithUser {
  isWorkspaceAdmin: boolean;
}

// GET /projects/:id/available-members
export interface IAvailableProjectMember {
  userId: string;
  user: IUserPublic;
}

// GET /projects/:id/analytics
export interface IProjectAnalytics {
  issuesByStatus: Record<IssueStatus, number>;
  issuesByType: Record<IssueType, number>;
  overdueCount: number;
  sprintVelocity: {
    sprintId: string;
    name: string;
    status: SprintStatus;
    doneCount: number;
    totalCount: number;
    percentage: number;
  }[];
  issuesByAssignee: {
    user: { id: string; name: string | null; avatarUrl: string | null } | null;
    count: number;
    overdueCount: number;
  }[];
}
