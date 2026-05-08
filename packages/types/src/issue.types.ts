import { IUserPublic } from "./user.types";
import { ISprint } from "./sprint.types";

export type IssueStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export type IssuePriority = "NO_PRIORITY" | "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export interface IIssue {
    id: string;
    title: string;
    description: string | null;
    status: IssueStatus;
    priority: IssuePriority;
    position: number;
    projectId: string;
    sprintId: string | null;
    assigneeId: string | null;
    creatorId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IIssueWithRelations extends IIssue {
    assignee?: IUserPublic | null;
    creator?: IUserPublic;
    sprint?: ISprint | null;
}