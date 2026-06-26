// ─── WebSocket Client → Server ────────────────────────────────────
export const ClientEvents = {
    JOIN_PROJECT: "JOIN_PROJECT",
    LEAVE_PROJECT: "LEAVE_PROJECT",
    JOIN_ISSUE: "JOIN_ISSUE",
    LEAVE_ISSUE: "LEAVE_ISSUE",
    CURSOR_MOVE: "CURSOR_MOVE",
    PING: "PING"
} as const

// ─── WebSocket Server → Project Room ─────────────────────────────
export const ProjectEvents = {
    ISSUE_MOVED: "ISSUE_MOVED",
    ISSUE_CREATED: "ISSUE_CREATED",
    ISSUE_UPDATED: "ISSUE_UPDATED",
    ISSUE_DELETED: "ISSUE_DELETED",
    SPRINT_STARTED: "SPRINT_STARTED",
    SPRINT_COMPLETED: "SPRINT_COMPLETED",
    CURSOR_MOVE: "CURSOR_MOVE",
    CURSOR_LEAVE: "CURSOR_LEAVE",
} as const

// ─── WebSocket Server → Issue Room ───────────────────────────────
export const IssueEvents = {
    COMMENT_ADDED: "COMMENT_ADDED",
    COMMENT_UPDATED: "COMMENT_UPDATED",
    COMMENT_DELETED: "COMMENT_DELETED",
    ACTIVITY_ADDED: 'ACTIVITY_ADDED',
    AI_SUMMARY_READY: 'AI_SUMMARY_READY',
    AI_SUMMARY_FAILED: 'AI_SUMMARY_FAILED',
    ATTACHMENT_ADDED: 'ATTACHMENT_ADDED',
    ATTACHMENT_DELETED: 'ATTACHMENT_DELETED',
} as const

// ─── WebSocket Server → Specific User ────────────────────────────
export const UserEvents = {
    NOTIFICATION: "NOTIFICATION",
    CONNECTED: "CONNECTED",
    PONG: "PONG",
    ERROR: "ERROR",
    JOINED_PROJECT: "JOINED_PROJECT",
    JOINED_ISSUE: "JOINED_ISSUE",
} as const

// ─── BullMQ Activity Queue ────────────────────────────────────────
export const ActivityActions = {
    ISSUE_CREATED: "ISSUE_CREATED",
    ISSUE_UPDATED: "ISSUE_UPDATED",
    ISSUE_DELETED: "ISSUE_DELETED",
    ISSUE_STATUS_CHANGED: "ISSUE_STATUS_CHANGED",
    ISSUE_ASSIGNED: "ISSUE_ASSIGNED",
    COMMENT_ADDED: "COMMENT_ADDED",
    COMMENT_UPDATED: "COMMENT_UPDATED",
    COMMENT_DELETED: "COMMENT_DELETED",
    SPRINT_STARTED: "SPRINT_STARTED",
    SPRINT_COMPLETED: "SPRINT_COMPLETED",
    SPRINT_CREATED: "SPRINT_CREATED",
    MEMBER_ADDED: "MEMBER_ADDED",
    MENTION: "MENTION"
} as const


// ─── BullMQ Notification + Email Queue ───────────────────────────
export const NotificationTypes = {
    ISSUE_ASSIGNED: "ISSUE_ASSIGNED",
    ISSUE_COMMENTED: 'ISSUE_COMMENTED',
    SPRINT_STARTED: 'SPRINT_STARTED',
    SPRINT_COMPLETED: "SPRINT_COMPLETED",
    PROJECT_ADDED: "PROJECT_ADDED",
    WORKSPACE_INVITED: "WORKSPACE_INVITED",
    MENTION: "MENTION",
    OTHER: "OTHER"
} as const