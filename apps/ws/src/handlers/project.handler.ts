import { AuthenticatedWebSocket } from "../types/socket.types";
import { logger } from "@devflow/backend-common";
import { joinProjectSchema, leaveProjectSchema } from "@devflow/validators"
import { subscribeToProjectChannel, unsubscribeFromProjectChannel } from "../lib/redis.subscriber";
import { prisma } from "@devflow/db"
import { roomManager } from "../RoomManager";

export const handleJoinProject = async (ws: AuthenticatedWebSocket, payload: { projectId: string }) => {
    const { payload: validPayload } = joinProjectSchema.parse({
        type: 'JOIN_PROJECT',
        payload,
    });
    const { projectId } = validPayload;

    // check membership
    const member = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: {
                projectId,
                userId: ws.userId
            }
        }
    })
    if (!member) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            message: 'You are not a member of this project',
        }))
        return;
    }
    const roomId = `project:${projectId}`
    // join WS room
    roomManager.join(roomId, ws)

    // subscribe to project channel
    subscribeToProjectChannel(projectId)

    logger.info(`User ${ws.userId} joined project room: ${projectId}`)

    ws.send(JSON.stringify({
        type: "JOINED_PROJECT",
        payload: { projectId }
    }))
}

export const handleLeaveProject = (ws: AuthenticatedWebSocket, payload: { projectId: string }) => {
    try {
        const { payload: validPayload } = leaveProjectSchema.parse({
            type: 'LEAVE_PROJECT',
            payload
        })
        const { projectId } = validPayload;
        const roomId = `project:${projectId}`

        roomManager.leave(roomId, ws)

        unsubscribeFromProjectChannel(projectId)
        logger.info(`User ${ws.userId} left project room: ${projectId}`)
    } catch (error) {
        logger.error({ error }, "LEAVE_PROJECT failed")
        ws.send(JSON.stringify({ type: "ERROR", message: "Invalid payload for LEAVE_PROJECT" }))
    }
}