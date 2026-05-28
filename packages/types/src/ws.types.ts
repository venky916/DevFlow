import { ClientEvents, ProjectEvents, IssueEvents, UserEvents } from "./events"
// all event types client can send
export type ClientEventType = typeof ClientEvents[keyof typeof ClientEvents]

// all event types server can send
export type ServerEventType = | typeof ProjectEvents[keyof typeof ProjectEvents] | typeof IssueEvents[keyof typeof IssueEvents] | typeof UserEvents[keyof typeof UserEvents]

export interface ClientEvent {
    type: ClientEventType;
    payload: Record<string, any>
}

export interface ServerEvent {
    type: ServerEventType;
    payload?: Record<string, any>;
    message?: string
}