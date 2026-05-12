import { AuthenticatedWebSocket } from "../types/socket.types";
import { joinRoom, leaveRoom } from "../rooms";
import { logger } from "@devflow/backend-common";

export const handleJoinProject = (ws: AuthenticatedWebSocket, payload: { projectId: string }) => {
    const { projectId } = payload;
    const roomId = `project:${projectId}`
    joinRoom(roomId, ws)

    logger.info(`User ${ws.userId} joined project room: ${projectId}`)

    ws.send(JSON.stringify({
        type: "JOINED_PROJECT",
        payload: { projectId }
    }))
}


export const handleLeaveProject = (ws:AuthenticatedWebSocket,payload:{projectId:string})=>{
    const {projectId} = payload;
    const roomId = `project:${projectId}`

    leaveRoom(roomId,ws)
    logger.info(`User ${ws.userId} left project room: ${projectId}`)
}