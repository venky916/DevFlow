// lib/issue-constants.ts
import type { IssuePriority, IssueStatus, IssueType } from '@devflow/types';

export const STATUS_OPTIONS = [
  { label: 'Backlog', value: 'BACKLOG' },
  { label: 'Todo', value: 'TODO' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'In Review', value: 'IN_REVIEW' },
  { label: 'Done', value: 'DONE' },
];

export const STATUS_LABELS: Record<IssueStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export function getStatusVariant(status: IssueStatus) {
  switch (status) {
    case 'BACKLOG':
      return 'neutral' as const;
    case 'TODO':
      return 'neutral' as const;
    case 'IN_PROGRESS':
      return 'warning' as const;
    case 'IN_REVIEW':
      return 'warning' as const;
    case 'DONE':
      return 'success' as const;
  }
}

export const PRIORITY_OPTIONS = [
  { label: 'No priority', value: 'NO_PRIORITY' },
  { label: 'Urgent', value: 'URGENT' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
];

export const PRIORITY_COLORS: Record<IssuePriority, string> = {
  URGENT: '#E24B4A',
  HIGH: '#EF9F27',
  MEDIUM: '#639922',
  LOW: '#555555',
  NO_PRIORITY: '#333333',
};

export const TYPE_OPTIONS = [
  { label: 'Bug', value: 'BUG' },
  { label: 'Feature', value: 'FEATURE' },
  { label: 'Task', value: 'TASK' },
  { label: 'Improvement', value: 'IMPROVEMENT' },
  { label: 'Other', value: 'OTHER' },
];

export const STATUS_ORDER: IssueStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export const STATUS_COLORS: Record<IssueStatus, string> = {
  BACKLOG: '#555555',
  TODO: '#4B8BE2',
  IN_PROGRESS: '#EF9F27',
  IN_REVIEW: '#8B5CF6',
  DONE: '#22C55E',
};

export const TYPE_LABELS: Record<IssueType, string> = {
  BUG: 'Bug',
  FEATURE: 'Feature',
  TASK: 'Task',
  IMPROVEMENT: 'Improvement',
  OTHER: 'Other',
};

export const TYPE_COLORS: Record<IssueType, string> = {
  BUG: '#E24B4A',
  FEATURE: '#8B5CF6',
  TASK: '#4B8BE2',
  IMPROVEMENT: '#EF9F27',
  OTHER: '#777777',
};

const FIELD_MESSAGES: Record<string, (from: any, to: any) => string> = {
  title: (_f, to) => `changed title to "${to}"`,
  description: () => `updated the description`,
  priority: (_f, to) => `changed priority to ${String(to).toLowerCase().replace('_', ' ')}`,
  type: (_f, to) => `changed type to ${to}`,
  dueDate: (_f, to) => (to ? `set due date` : 'removed due date'),
  assigneeId: (_f, to) => (to ? 'reassigned this issue' : 'removed the assignee'),
  status: (from, to) =>
    `moved from ${STATUS_LABELS[from as IssueStatus] ?? from} to ${STATUS_LABELS[to as IssueStatus] ?? to}`,
};

export function activityText(action: string, meta?: Record<string, any>): string[] {
  switch (action) {
    case 'ISSUE_CREATED':
      return [meta?.parentId ? 'created this sub-issue' : 'created this issue'];

    case 'ISSUE_UPDATED': {
      if (meta?.attachedToParent) return ['attached as sub-issue'];
      if (meta?.detachedFromParent) return ['detached from parent'];

      const changes = meta?.changes ?? {};
      const lines = Object.entries(changes)
        .map(([field, val]: [string, any]) => {
          if (!val || typeof val !== 'object' || !('to' in val)) return null;
          return FIELD_MESSAGES[field]?.(val.from, val.to);
        })
        .filter(Boolean) as string[];

      return lines.length > 0 ? lines : ['updated this issue'];
    }

    case 'ISSUE_STATUS_CHANGED':
      return meta?.from === meta?.to
        ? [`reordered to ${STATUS_LABELS[meta?.to as IssueStatus] ?? meta?.to}`]
        : [
            `moved from ${STATUS_LABELS[meta?.from as IssueStatus] ?? meta?.from} to ${STATUS_LABELS[meta?.to as IssueStatus] ?? meta?.to}`,
          ];

    case 'ISSUE_ASSIGNED':
      return ['was assigned this issue'];

    case 'ISSUE_DELETED':
      return [`deleted issue: ${meta?.title ?? ''}`];

    case 'COMMENT_ADDED':
      return [
        meta?.preview
          ? `commented: "${meta.preview.slice(0, 60)}${meta.preview.length > 60 ? '...' : ''}"`
          : 'added a comment',
      ];

    case 'COMMENT_UPDATED':
      return ['edited a comment'];

    case 'COMMENT_DELETED':
      return ['deleted a comment'];

    case 'SPRINT_CREATED':
      return [`created sprint: ${meta?.sprintName ?? ''}`];

    case 'SPRINT_STARTED':
      return [`started sprint: ${meta?.sprintName ?? ''}`];

    case 'SPRINT_COMPLETED':
      return [
        `completed sprint — ${meta?.doneCount ?? 0} done, ${meta?.incompleteCount ?? 0} moved to backlog`,
      ];

    case 'MEMBER_ADDED':
      return [`added a new member as ${meta?.role?.toLowerCase() ?? 'developer'}`];

    case 'MENTION':
      return ['mentioned someone in a comment'];

    default:
      return [action.toLowerCase().replace(/_/g, ' ')];
  }
}
