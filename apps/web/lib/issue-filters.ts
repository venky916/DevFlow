export type DueDatePreset = 'overdue' | 'today' | 'this_week' | 'no_due_date' | 'custom';

export interface IssueFilters {
  assigneeId?: string;
  labelId?: string;
  priority?: string;
  type?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  noDueDate?: boolean;
  dueDatePreset?: DueDatePreset; // UI only, not sent to the API
  projectId?: string;
  sprintId?: string;
  q?: string;
}

// the filters the API understands (undefined values are dropped by axios)
export function toApiFilters(filters: IssueFilters) {
  return {
    assigneeId: filters.assigneeId,
    labelId: filters.labelId,
    priority: filters.priority,
    type: filters.type,
    dueDateFrom: filters.dueDateFrom,
    dueDateTo: filters.dueDateTo,
    noDueDate: filters.noDueDate,
    q: filters.q,
  };
}

// the filters the my-issues endpoints understand
export function toMyIssuesFilters(filters: IssueFilters) {
  return {
    projectId: filters.projectId,
    sprintId: filters.sprintId,
    priority: filters.priority,
    type: filters.type,
    dueDateFrom: filters.dueDateFrom,
    dueDateTo: filters.dueDateTo,
    noDueDate: filters.noDueDate,
    q: filters.q,
  };
}
