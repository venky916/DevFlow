import { WebSocket } from 'ws';
import { AuthenticatedWebSocket } from './types/socket.types';
import { ServerEvent } from "@devflow/types"

class RoomManager {
    private static instance: RoomManager;
    private rooms: Map<String, Set<AuthenticatedWebSocket>>;

    private constructor() {
        this.rooms = new Map();
    }

    static getInstance(): RoomManager {
        if (!RoomManager.instance) {
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance
    }

    join(roomId: string, ws: AuthenticatedWebSocket) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set())
        }
        this.rooms.get(roomId)?.add(ws)
    }

    leave(roomId: string, ws: AuthenticatedWebSocket) {
        this.rooms.get(roomId)?.delete(ws)
        // cleanup empty rooms
        if (this.rooms.get(roomId)?.size === 0) {
            this.rooms.delete(roomId)
        }
    }

    leaveAll(ws: AuthenticatedWebSocket) {
        this.rooms.forEach((clients, roomId) => {
            clients.delete(ws)
            if (clients.size === 0) {
                this.rooms.delete(roomId)
            }
        })
    }

    broadcast(roomId: string, event: ServerEvent, exclude?: AuthenticatedWebSocket) {
        this.rooms.get(roomId)?.forEach(client => {
            if (client !== exclude && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(event))
            }
        })
    }

    getRoomSize(roomId: string): number {
        return this.rooms.get(roomId)?.size ?? 0
    }

    getRooms() {
        return Array.from(this.rooms.keys())
    }
}


export const roomManager = RoomManager.getInstance()