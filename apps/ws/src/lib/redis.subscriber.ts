import { subscriber } from "@devflow/backend-common";
import { logger } from "@devflow/backend-common";
import { broadcastToRoom } from "../rooms";

subscriber.on("message", (channel, message) => {
    try {
        const event = JSON.parse(message)
        logger.info({ channel, type: event.type }, "Redis event received")
        broadcastToRoom(channel, event)
    } catch (error) {
        logger.error({ error }, "Redis event error")
    }
})

export const subscribeToProjectChannel = (projectId: string) => {
    const channel = `project:${projectId}`
    subscriber.subscribe(channel, (error) => {
        if (error) {
            logger.error({ error }, `Failed to subscribe to ${channel}`)
            return
        }
        logger.info(`Subscribed to Redis channel: ${channel}`)
    })

}

export const unsubscribeFromProjectChannel = (projectId: string) => {
    const channel = `project:${projectId}`
    subscriber.unsubscribe(channel, (error) => {
        if (error) {
            logger.error({ error }, `Failed to unsubscribe from ${channel}`)
            return
        }
        logger.info(`Unsubscribed from Redis channel: ${channel}`)
    })
}

export const subscribeToIssueChannel = (issueId: string) => {
    const channel = `issue:${issueId}`
    subscriber.subscribe(channel, (error) => {
        if (error) {
            logger.error({ error }, `Failed to subscribe to ${channel}`)
            return
        }
        logger.info(`Subscribed to Redis channel: ${channel}`)
    })
}

export const unsubscribeFromIssueChannel = (issueId: string) => {
    const channel = `issue:${issueId}`
    subscriber.unsubscribe(channel, (error) => {
        if (error) {
            logger.error({ error }, `Failed to unsubscribe from ${channel}`)
            return
        }
        logger.info(`Unsubscribed from Redis channel: ${channel}`)
    })
}