import { WebSocket } from 'ws';

import type { IPresenceUser, ServerEvent } from '@devflow/types';

import { AuthenticatedWebSocket } from './types/socket.types';

class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, Set<AuthenticatedWebSocket>>;

  private constructor() {
    this.rooms = new Map();
  }

  static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  join(roomId: string, ws: AuthenticatedWebSocket) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)?.add(ws);
  }

  leave(roomId: string, ws: AuthenticatedWebSocket) {
    this.rooms.get(roomId)?.delete(ws);
    // cleanup empty rooms
    if (this.rooms.get(roomId)?.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  // removes the socket from every room, and returns the rooms it was in
  leaveAll(ws: AuthenticatedWebSocket): string[] {
    const left: string[] = [];
    this.rooms.forEach((clients, roomId) => {
      if (clients.delete(ws)) left.push(roomId);
      if (clients.size === 0) {
        this.rooms.delete(roomId);
      }
    });
    return left;
  }

  broadcast(roomId: string, event: ServerEvent, exclude?: AuthenticatedWebSocket) {
    this.rooms.get(roomId)?.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(event));
      }
    });
  }

  // how the web shows a person
  describe(ws: AuthenticatedWebSocket): IPresenceUser {
    return { id: ws.userId, name: ws.name ?? (ws.email || 'Someone'), avatarUrl: ws.avatarUrl };
  }

  // the people in a room. A person with two tabs counts once.
  getUsers(roomId: string): IPresenceUser[] {
    const users = new Map<string, IPresenceUser>();
    this.rooms.get(roomId)?.forEach((client) => {
      if (!users.has(client.userId)) users.set(client.userId, this.describe(client));
    });
    return [...users.values()];
  }

  // how many tabs (sockets) of one person are in a room
  countForUser(roomId: string, userId: string): number {
    let count = 0;
    this.rooms.get(roomId)?.forEach((client) => {
      if (client.userId === userId) count += 1;
    });
    return count;
  }

  // is this socket in the room
  has(roomId: string, ws: AuthenticatedWebSocket): boolean {
    return this.rooms.get(roomId)?.has(ws) ?? false;
  }

  getRoomSize(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  getRooms() {
    return Array.from(this.rooms.keys());
  }
}

export const roomManager = RoomManager.getInstance();
