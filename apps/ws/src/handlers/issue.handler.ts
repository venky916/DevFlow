import { AuthenticatedWebSocket } from "../types/socket.types";
import { joinRoom, leaveRoom } from "../rooms";
import { logger } from "@devflow/backend-common";

export const handleJoinIssue = (ws: AuthenticatedWebSocket, payload: { issueId: string }) => {
    const { issueId } = payload;
    const roomId = `issue:${issueId}`
    joinRoom(roomId, ws)
    logger.info(`User ${ws.userId} joined issue room: ${issueId}`)
    ws.send(JSON.stringify({
        type: "JOINED_ISSUE",
        payload: { issueId }
    }))
}

export const handleLeaveIssue = (ws: AuthenticatedWebSocket, payload: { issueId: string }) => {
    const { issueId } = payload;
    const roomId = `issue:${issueId}`
    leaveRoom(roomId, ws)
    logger.info(`User ${ws.userId} left issue room: ${issueId}`)
}