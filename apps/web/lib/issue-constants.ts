// lib/issue-constants.ts
import type { IssueStatus, IssuePriority, IssueType } from "@devflow/types";

export const STATUS_OPTIONS = [
    { label: "Backlog", value: "BACKLOG" },
    { label: "Todo", value: "TODO" },
    { label: "In Progress", value: "IN_PROGRESS" },
    { label: "In Review", value: "IN_REVIEW" },
    { label: "Done", value: "DONE" },
];

export const STATUS_LABELS: Record<IssueStatus, string> = {
    BACKLOG: "Backlog",
    TODO: "Todo",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    DONE: "Done",
};

export function getStatusVariant(status: IssueStatus) {
    switch (status) {
        case "BACKLOG": return "neutral" as const;
        case "TODO": return "neutral" as const;
        case "IN_PROGRESS": return "warning" as const;
        case "IN_REVIEW": return "warning" as const;
        case "DONE": return "success" as const;
    }
}

export const PRIORITY_OPTIONS = [
    { label: "No priority", value: "NO_PRIORITY" },
    { label: "Urgent", value: "URGENT" },
    { label: "High", value: "HIGH" },
    { label: "Medium", value: "MEDIUM" },
    { label: "Low", value: "LOW" },
];

export const PRIORITY_COLORS: Record<IssuePriority, string> = {
    URGENT: "#E24B4A",
    HIGH: "#EF9F27",
    MEDIUM: "#639922",
    LOW: "#555555",
    NO_PRIORITY: "#333333",
};

export const TYPE_OPTIONS = [
    { label: "Bug", value: "BUG" },
    { label: "Feature", value: "FEATURE" },
    { label: "Task", value: "TASK" },
    { label: "Improvement", value: "IMPROVEMENT" },
    { label: "Other", value: "OTHER" },
];

export function activityText(action: string, meta?: Record<string, any>): string {
    switch (action) {
        case "ISSUE_CREATED":
            return "created this issue";
        case "ISSUE_UPDATED":
            return "updated this issue";
        case "ISSUE_STATUS_CHANGED":
            return `moved to ${STATUS_LABELS[meta?.to as IssueStatus] ?? meta?.to}`;
        case "ISSUE_DELETED":
            return "deleted this issue";
        case "COMMENT_ADDED":
            return "added a comment";
        case "COMMENT_DELETED":
            return "deleted a comment";
        default:
            return action.toLowerCase().replace(/_/g, " ");
    }
}