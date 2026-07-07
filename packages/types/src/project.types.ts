import { IUserPublic } from "./user.types";

export type ProjectRole ="LEAD" | "DEVELOPER" | "VIEWER";

export interface IProject {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    color: string | null;
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

export interface IProjectLabel {
    id: string;
    name: string;
    color: string;
    projectId: string;
    createdAt: Date;
}


export interface IProjectWithMembers extends IProject {
    members: IProjectMember[];
    _count?: {
        members: number,
        issues: number,
        sprints: number
    }
}
