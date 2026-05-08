import { IUserPublic } from "./user.types";

export type WorkspaceRole = "OWNER" | "ADMIN" | "LEAD" | "DEVELOPER" | "VIEWER";

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