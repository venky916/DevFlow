import { IUserPublic } from "./user.types";

export type ProjectRole = "ADMIN" | "LEAD" | "DEVELOPER" | "VIEWER";

export interface IProject {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    workspaceId: string;
    createdAt: Date;
    updatedAt: Date;
}


export interface IProjectMember {
    id: string;
    projectId: string;
    userId: string;
    role: ProjectRole;
    joinedAt: Date;
    user?: IUserPublic;
}


export interface IProjectWithMembers extends IProject {
    members: IProjectMember[];
    _count?: {
        members: number,
        issues: number,
        sprints: number
    }
}