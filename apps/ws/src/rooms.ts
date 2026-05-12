import { WebSocket } from "ws"
import { AuthenticatedWebSocket } from "./types/socket.types";
import {ServerEvent} from "@devflow/types"

const rooms = new Map<String, Set<AuthenticatedWebSocket>>();
// rooms = {
// "room-1" → { socket1, socket2, socket3 },
// "room-2" → { socket4, socket5 }
// }

export const joinRoom = (roomId: string, ws: AuthenticatedWebSocket) => {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set())
    }
    rooms.get(roomId)?.add(ws)
}

export const leaveRoom = (roomId: string, ws: AuthenticatedWebSocket) => {
    rooms.get(roomId)?.delete(ws)
    // cleanup empty rooms
    if (rooms.get(roomId)?.size === 0) {
        rooms.delete(roomId)
    }
}

export const leaveAllRooms = (ws: AuthenticatedWebSocket) => {
    rooms.forEach((clients, roomId) => {
        clients.delete(ws)
        if (clients.size === 0) {
            rooms.delete(roomId)
        }
    })
}

export const broadcastToRoom = (roomId: string, event: ServerEvent, exclude?: AuthenticatedWebSocket) => {
    rooms.get(roomId)?.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(event))
        }
    })
}

export const getRoomSize = (roomId: string) => {
    return rooms.get(roomId)?.size ?? 0
}