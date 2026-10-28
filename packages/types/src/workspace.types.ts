import { IUserPublic } from './user.types';

export type WorkspaceRole = 'ADMIN' | 'MEMBER';

export interface IWorkspace {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Returned by GET /workspaces/summary and GET /workspaces/by-slug/:slug
export interface IWorkspaceSummary extends IWorkspace {
  _count: { projects: number; members: number };
  currentUserWorkspaceRole: WorkspaceRole;
}

export interface IWorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user?: IUserPublic;
}

export interface IWorkspaceWithMembers extends IWorkspaceSummary {
  members: IWorkspaceMember[];
}

export interface IWorkspaceMemberWithUser extends IWorkspaceMember {
  user: IUserPublic;
}

export interface IWorkspaceInvite {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  createdAt: string;
  inviter?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface IAcceptedInvite {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
}

export interface IWorkspaceAnalytics {
  totalIssues: number;
  activeSprintsCount: number;
  memberCount: number;
  issuesByProject: {
    project: { id: string; name: string; color: string | null };
    count: number;
  }[];
  roleBreakdown: Record<WorkspaceRole, number>;
  members: {
    user: IUserPublic;
    role: WorkspaceRole;
    joinedAt: string;
  }[];
}