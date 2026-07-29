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

        // ─── issue level ──────────────────────────────────────────
        case "ISSUE_CREATED":
            return meta?.parentId
                ? "created this sub-issue"
                : "created this issue"

        case "ISSUE_UPDATED":
            if (meta?.changes?.assigneeId !== undefined)
                return meta.changes.assigneeId
                    ? "reassigned this issue"
                    : "removed the assignee"
            if (meta?.changes?.dueDate !== undefined)
                return meta.changes.dueDate
                    ? `set due date`
                    : "removed due date"
            if (meta?.changes?.type !== undefined)
                return `changed type to ${meta.changes.type}`
            if (meta?.changes?.priority !== undefined)
                return `changed priority to ${meta.changes.priority?.toLowerCase().replace("_", " ")}`
            if (meta?.attachedToParent)
                return "attached as sub-issue"
            if (meta?.detachedFromParent)
                return "detached from parent"
            return "updated this issue"

        case "ISSUE_STATUS_CHANGED":
            if (meta?.from === meta?.to)
                return `reordered to ${STATUS_LABELS[meta?.to as IssueStatus] ?? meta?.to}`
            return `moved from ${STATUS_LABELS[meta?.from as IssueStatus] ?? meta?.from} to ${STATUS_LABELS[meta?.to as IssueStatus] ?? meta?.to}`

        case "ISSUE_ASSIGNED":
            return "was assigned this issue"

        case "ISSUE_DELETED":
            return `deleted issue: ${meta?.title ?? ""}`

        // ─── comment level ────────────────────────────────────────
        case "COMMENT_ADDED":
            return meta?.preview
                ? `commented: "${meta.preview.slice(0, 60)}${meta.preview.length > 60 ? "..." : ""}"`
                : "added a comment"

        case "COMMENT_UPDATED":
            return "edited a comment"

        case "COMMENT_DELETED":
            return "deleted a comment"

        // ─── project level ────────────────────────────────────────
        case "SPRINT_CREATED":
            return `created sprint: ${meta?.sprintName ?? ""}`

        case "SPRINT_STARTED":
            return `started sprint: ${meta?.sprintName ?? ""}`

        case "SPRINT_COMPLETED":
            return `completed sprint — ${meta?.doneCount ?? 0} done, ${meta?.incompleteCount ?? 0} moved to backlog`

        case "MEMBER_ADDED":
            return `added a new member as ${meta?.role?.toLowerCase() ?? "developer"}`

        case "MENTION":
            return "mentioned someone in a comment"

        default:
            return action.toLowerCase().replace(/_/g, " ")
    }
}