import { ClientEvents, IssueEvents, ProjectEvents, UserEvents } from './events';

// all event types client can send
export type ClientEventType = (typeof ClientEvents)[keyof typeof ClientEvents];

// all event types server can send
export type ServerEventType =
  | (typeof ProjectEvents)[keyof typeof ProjectEvents]
  | (typeof IssueEvents)[keyof typeof IssueEvents]
  | (typeof UserEvents)[keyof typeof UserEvents];

export interface ClientEvent {
  type: ClientEventType;
  payload: Record<string, any>;
}

export interface ServerEvent {
  type: ServerEventType;
  payload?: Record<string, any>;
  message?: string;
}

// someone who has an issue open (sent by the ws server)
export interface IPresenceUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

// what a person is doing right now on an issue. null means they stopped.
export type PresenceActionKind = 'commenting' | 'editing' | 'uploading';

// one "someone is doing something" hint, ready to show
export interface IPresenceHint {
  user: IPresenceUser;
  kind: PresenceActionKind;
}
