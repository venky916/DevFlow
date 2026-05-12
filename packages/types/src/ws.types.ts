
// all event types client can send
export type ClientEventType = | 'JOIN_PROJECT'
    | 'LEAVE_PROJECT'
    | 'JOIN_ISSUE'
    | 'LEAVE_ISSUE'
    | 'CURSOR_MOVE'
    | 'PING';

// all event types server can send
export type ServerEventType = | 'CONNECTED'
    | 'JOINED_PROJECT'
    | 'JOINED_ISSUE'
    | 'ISSUE_MOVED'
    | 'ISSUE_CREATED'
    | 'ISSUE_UPDATED'
    | 'ISSUE_DELETED'
    | 'SPRINT_STARTED'
    | 'SPRINT_COMPLETED'
    | 'COMMENT_ADDED'
    | 'CURSOR_MOVE'
    | 'PONG'
    | 'ERROR';

export interface ClientEvent {
    type: ClientEventType;
    payload: Record<string, any>
}

export interface ServerEvent {
    type: ServerEventType;
    payload?: Record<string, any>;
    message?: string
}