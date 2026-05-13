import { WebSocket } from "ws";

import { adminAuth } from "@devflow/backend-common";
import { logger } from "@devflow/backend-common";
import { AuthenticatedWebSocket } from "../types/socket.types";
import { IncomingMessage } from "node:http";
import { prisma } from "@devflow/db";

export const authenticateWS = async (ws: WebSocket, req: IncomingMessage) => {
    try {
        // get token from query param
        // ws://localhost:4001?token=FIREBASE_TOKEN
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        if (!token) {
            ws.send(JSON.stringify({
                type: "ERROR",
                message: "No token provided"
            }))
            ws.close(1008, "Unauthorized")
            return false
        }

        const decoded = await adminAuth.verifyIdToken(token)

        const user = await prisma.user.findUnique({
            where: {
                firebaseUid: decoded.uid
            }
        })

        if (!user) {
            ws.send(JSON.stringify({
                type: "ERROR",
                message: "User not found, please login first"
            }))
            ws.close(1008, "Unauthorized")
            return false
        }

        // attach user to ws connection
        const authWs = ws as AuthenticatedWebSocket;
        authWs.userId = user.id;
        authWs.email = user.email ?? "";
        authWs.name = user.name ?? null

        logger.info(`User authenticated: ${decoded.email} `)

        return true
    } catch (error) {
        logger.error({ error }, "WS auth failed")
        ws.send(JSON.stringify({
            type: "ERROR",
            message: "Invalid or expired token"
        }))

        ws.close(1008, "Unauthorized")
        return false
    }
} 