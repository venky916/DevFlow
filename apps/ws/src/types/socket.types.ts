import { WebSocket } from "ws";

// authenticated WS client
export interface AuthenticatedWebSocket extends WebSocket {
    userId: string;
    email: string;
    name: string | null
}
