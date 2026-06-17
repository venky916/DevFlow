import { IIssueWithRelations } from "./issue.types";

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED'

export interface ISprint {
    id: string;
    name: string;
    projectId: string;
    status: SprintStatus;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ISprintWithCount extends ISprint {
    _count: {
        issues: number;
    },
    doneCount: number;
}

export interface ISprintWithIssues extends ISprint {
    issues: IIssueWithRelations[];
}