import "dotenv/config"
import http from "http"
import { WebSocketServer } from "ws"
import { AuthenticatedWebSocket } from "./types/socket.types"
import { authenticateWS } from "./middlewares/auth"
import { logger } from "@devflow/backend-common"
import { ClientEvent } from "@devflow/types"
import { handleJoinProject, handleLeaveProject } from "./handlers/project.handler"
import { handleJoinIssue, handleLeaveIssue } from "./handlers/issue.handler"
import { leaveAllRooms } from "./rooms"

const PORT = process.env.PORT ?? 4001

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: 'ok', service: 'ws', timestamp: new Date().toISOString() }));
        return;
    }

    res.writeHead(404);
    res.end();
})

// ─── WebSocket server ─────────────────────────────────────────────
const wss = new WebSocketServer({ server })


wss.on('connection', async (ws, req) => {
    const authWs = ws as AuthenticatedWebSocket;
    const authenticated = await authenticateWS(ws, req)
    if (!authenticated) return;

    logger.info(`Client connected: ${authWs.userId}`);

    // send welcome message
    ws.send(JSON.stringify({ type: "CONNECTED", message: `Welcome ${authWs.name ?? authWs.email}!` }));

    // ─── Message handler ──────────────────────────────────────
    ws.on('message', (data) => {

        try {
            const event: ClientEvent = JSON.parse(data.toString());
            logger.info({ type: event.type, userId: authWs.userId }, "Event received");

            switch (event.type) {
                case "JOIN_PROJECT": {
                    handleJoinProject(authWs, event.payload as { projectId: string })
                    break;
                }
                case "LEAVE_PROJECT": {
                    handleLeaveProject(authWs, event.payload as { projectId: string })
                    break;
                }
                case "JOIN_ISSUE": {
                    handleJoinIssue(authWs, event.payload as { issueId: string })
                    break;
                }
                case "LEAVE_ISSUE": {
                    handleLeaveIssue(authWs, event.payload as { issueId: string })
                    break;
                }
                case "PING": {
                    ws.send(JSON.stringify({ type: "PONG" }));
                    break;
                }

                default: {
                    logger.warn({ type: event.type }, "Unknown event type");
                    ws.send(JSON.stringify({ type: "ERROR", message: `Unknown event type: ${event.type}` }));
                }
            }
        } catch (error) {
            logger.error({ error }, "Failed to parse message");

            ws.send(JSON.stringify({ type: "ERROR", message: 'Failed to parse message' }));

        }
    })

    // ─── Disconnect handler ───────────────────────────────────
    ws.on('close', () => {
        leaveAllRooms(authWs);
        logger.info('Client disconnected');
    })

    // ─── Handle error ──────────────────────────────────────────
    ws.on('error', (error) => {
        logger.error({ error }, "WebSocket error");
    })
})


server.listen(PORT, () => {
    logger.info(`🚀 WS server running on http://localhost:${PORT}`);
    logger.info(`🔌 WebSocket ready on ws://localhost:${PORT}`)
})