import { IUserPublic } from "./user.types";

export type WorkspaceRole = "ADMIN" | "DEVELOPER" | "VIEWER";

export interface IWorkspace {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface IWorkspaceMember {
    id: string,
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    joinedAt: Date;
    user?: IUserPublic
}


export interface IWorkspaceWithMembers extends IWorkspace {
    members: IWorkspaceMember[];
    _count?: {
        projects: number,
        members: number
    }
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