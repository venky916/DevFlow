import { auth } from './firebase';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
const PING_EVERY_MS = 30_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export interface ServerMessage {
  type: string;
  payload?: Record<string, unknown>;
  message?: string;
}

type Listener = (message: ServerMessage) => void;

// the message names the ws server understands
const ROOMS = {
  project: { join: 'JOIN_PROJECT', leave: 'LEAVE_PROJECT', field: 'projectId' },
  issue: { join: 'JOIN_ISSUE', leave: 'LEAVE_ISSUE', field: 'issueId' },
} as const;

export type RoomKind = keyof typeof ROOMS;

// One connection for the whole app. It connects with the Firebase token, keeps itself alive,
// reconnects after a drop, and joins the rooms again after a reconnect.
class SocketClient {
  private socket: WebSocket | null = null;
  private ready = false; // true once the server has said CONNECTED
  private wantConnected = false;
  private opening = false;
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<Listener>();
  private rooms = new Map<string, { kind: RoomKind; id: string }>();

  connect() {
    this.wantConnected = true;
    void this.open();
  }

  disconnect() {
    this.wantConnected = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.stopPing();
    const socket = this.socket;
    this.socket = null; // so the old socket's onclose is ignored
    this.ready = false;
    socket?.close();
  }

  // returns a function that removes the listener
  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // returns a function that leaves the room again
  joinRoom(kind: RoomKind, id: string) {
    this.rooms.set(`${kind}:${id}`, { kind, id });
    if (this.ready) this.sendJoin(kind, id);
    return () => this.leaveRoom(kind, id);
  }

  // a small message from a page to the server (for example "I am typing").
  // It is dropped when we are not connected, because a hint is not worth keeping.
  sendMessage(message: object) {
    if (this.ready) this.send(message);
  }

  private leaveRoom(kind: RoomKind, id: string) {
    this.rooms.delete(`${kind}:${id}`);
    if (this.ready) {
      this.send({ type: ROOMS[kind].leave, payload: { [ROOMS[kind].field]: id } });
    }
  }

  private sendJoin(kind: RoomKind, id: string) {
    this.send({ type: ROOMS[kind].join, payload: { [ROOMS[kind].field]: id } });
  }

  private send(message: object) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  private async open() {
    if (!WS_URL || this.socket || this.opening) return;
    this.opening = true;

    let token: string | undefined;
    try {
      await auth.authStateReady();
      token = await auth.currentUser?.getIdToken(); // a fresh token on every (re)connect
    } catch {
      this.opening = false;
      if (this.wantConnected) this.scheduleReconnect();
      return;
    }
    this.opening = false;

    // not signed in, or disconnect() was called while the token was being fetched
    if (!token || !this.wantConnected || this.socket) return;

    const socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    this.socket = socket;

    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      let message: ServerMessage;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      // the server accepts messages only after it has sent CONNECTED, so joining waits for it
      if (message.type === 'CONNECTED') this.handleReady();
      this.listeners.forEach((listener) => listener(message));
    };

    socket.onclose = () => {
      if (this.socket !== socket) return; // an old socket that was already replaced
      this.socket = null;
      this.ready = false;
      this.stopPing();
      if (this.wantConnected) this.scheduleReconnect();
    };
  }

  private handleReady() {
    this.ready = true;
    this.attempts = 0;
    this.startPing();
    this.rooms.forEach(({ kind, id }) => this.sendJoin(kind, id));
  }

  // 1s, 2s, 4s ... up to 30s
  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.attempts, MAX_RECONNECT_DELAY_MS);
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.open();
    }, delay);
  }

  // an idle socket can be closed by proxies, so we send a small message now and then
  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => this.send({ type: 'PING' }), PING_EVERY_MS);
  }

  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
}

export const socketClient = new SocketClient();
