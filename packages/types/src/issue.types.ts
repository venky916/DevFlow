import { IUserPublic } from "./user.types";
import { ISprint } from "./sprint.types";
import { IProjectLabel } from "./project.types";

export type IssueStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export type IssuePriority = "NO_PRIORITY" | "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export type IssueType = "BUG" | "TASK" | "FEATURE" | "IMPROVEMENT" | "OTHER";

export interface IIssue {
    id: string;
    title: string;
    description: string | null;
    status: IssueStatus;
    priority: IssuePriority;
    position: string;
    type: IssueType;
    dueDate: Date | null;
    parentId: string | null;
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
    parent?: { id: string; title: string } | null;
    children?: IIssueWithRelations[];
    labels?: IProjectLabel[];
}