import type { IIssueCard } from './issue.types';

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface ISprint {
  id: string;
  name: string;
  projectId: string;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ISprintWithCount extends ISprint {
  _count: { issues: number };
  doneCount: number;
}

export interface ISprintWithIssues extends ISprint {
  issues: IIssueCard[];
}

// POST /sprints/:id/complete
export interface ISprintCompletion {
  sprintId: string;
  doneCount: number;
  incompleteCount: number;
}