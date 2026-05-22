import { AuthenticatedWebSocket } from "../types/socket.types";
import { logger } from "@devflow/backend-common";
import { subscribeToIssueChannel, unsubscribeFromIssueChannel } from "../lib/redis.subscriber";
import { joinIssueSchema, leaveIssueSchema } from "@devflow/validators";
import { prisma } from "@devflow/db";
import { roomManager } from "../roomManager";

export const handleJoinIssue = async (ws: AuthenticatedWebSocket, payload: { issueId: string }) => {
    try {
        const { payload: validPayload } = joinIssueSchema.parse({ type: "JOIN_ISSUE", payload });
        const { issueId } = validPayload;
        const issue = await prisma.issue.findUnique({
            where: {
                id: issueId
            },
            select: {
                projectId: true
            }
        })

        if (!issue) {
            ws.send(JSON.stringify({
                type: "ERROR",
                payload: { message: "Issue not found" }
            }))
            return;
        }
        const member = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: {
                    projectId: issue.projectId,
                    userId: ws.userId
                }
            }
        })

        if (!member) {
            ws.send(JSON.stringify({
                type: "ERROR",
                payload: { message: "You are not a member of this project" }
            }))
            return;
        }
        const roomId = `issue:${issueId}`
        roomManager.join(roomId, ws)
        subscribeToIssueChannel(issueId)
        logger.info(`User ${ws.userId} joined issue room: ${issueId}`)
        ws.send(JSON.stringify({
            type: "JOINED_ISSUE",
            payload: { issueId }
        }))
    } catch (error) {
        logger.error({ error }, "JOIN_ISSUE failed")
        ws.send(JSON.stringify({ type: "ERROR", message: "Invalid payload for JOIN_ISSUE" }))
    }

}

export const handleLeaveIssue = (ws: AuthenticatedWebSocket, payload: { issueId: string }) => {
    try {
        const { payload: validPayload } = leaveIssueSchema.parse({
            type: "LEAVE_ISSUE",
            payload
        })

        const { issueId } = validPayload
        const roomId = `issue:${issueId}`
        roomManager.leave(roomId, ws)
        unsubscribeFromIssueChannel(issueId)
        logger.info(`User ${ws.userId} left issue room: ${issueId}`)
    } catch (error) {
        logger.error({ error }, "LEAVE_ISSUE failed")
        ws.send(JSON.stringify({ type: "ERROR", message: "Invalid payload for LEAVE_ISSUE" }))
    }

}