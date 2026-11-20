# ws

The websocket server. It sends live updates to open browsers: notifications, board changes, comments, files, and who is on the page. Package name: `ws-server`, folder `apps/ws`. Port 4001.

**The rule that matters:** a message is only a **hint**. The database is the truth. If a message is lost, the browser fixes itself by refetching, so nothing may depend on a message arriving.

**Must not:** write to the database, run business rules, or trust an id sent by a browser.

## Commands

```
pnpm --filter ws-server run dev
pnpm --filter ws-server run lint
pnpm --filter ws-server run check-types
pnpm --filter ws-server run format
```

## Folder map

- `src/index.ts`: the HTTP server (`/health`) and the websocket server. It checks the token on connect, routes each message to a handler, and runs the heartbeat (the socket ping, not the Better Stack one). It registers a clean shutdown: it tells the browsers to reconnect, then flushes the last logs and errors.
- `src/middlewares/auth.ts`: `authenticateWS` reads `?token=` from the URL, verifies the Firebase token, and loads the user.
- `src/RoomManager.ts`: which sockets are in which room, and broadcasting to a room.
- `src/handlers/`: `project`, `issue`, `presence`, `cursor` and `drag` handlers.
- `src/lib/access.ts`: `canAccessProject` (a project member, or an admin of its workspace).
- `src/lib/presence.ts`: announces who joined and left an issue.
- `src/lib/redis.subscriber.ts`: listens on Redis channels and forwards the events to the matching room. A Redis event it cannot handle is logged and sent to Sentry.
- `src/types/socket.types.ts`: the authenticated socket type.

## How it works

- Three kinds of room: `user:<id>` (joined automatically), `project:<id>` and `issue:<id>`. The web joins the other two while a page is open.
- **Saved events** go the long way: the API or a worker saves data, then publishes to the Redis channel with the same name as the room, and this server forwards it. The server never sees the data change itself.
- **Temporary events** (presence hints, pointers, drag markers) go straight from one socket to the others in the room. Nothing is saved, and they do not touch Redis.
- The first message the browser may send is after it receives `CONNECTED`. Earlier ones would be lost.

### Which events take which path

| Path                                                            | Events                                                                                                                                                                                                                                                                                      | Who starts it        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **Through Redis** (works with several ws servers)               | `ISSUE_CREATED`, `ISSUE_UPDATED`, `ISSUE_MOVED`, `ISSUE_DELETED`, `SPRINT_STARTED`, `SPRINT_COMPLETED` to `project:<id>`. `COMMENT_ADDED`, `COMMENT_UPDATED`, `COMMENT_DELETED`, `ATTACHMENT_ADDED`, `ATTACHMENT_DELETED`, `ACTIVITY_ADDED` to `issue:<id>`. `NOTIFICATION` to `user:<id>`. | The API, or a worker |
| **Direct** (browser to this server to the room, in memory only) | `PRESENCE_ACTION`, `CURSOR_MOVE`, `CURSOR_LEAVE`, `DRAG_START`, `DRAG_END`                                                                                                                                                                                                                  | A browser            |
| **Made by this server**                                         | `CONNECTED`, `PONG`, `ERROR`, `JOINED_PROJECT`, `JOINED_ISSUE`, `PRESENCE_STATE`, `PRESENCE_JOINED`, `PRESENCE_LEFT`, and the `CURSOR_LEAVE` and `DRAG_END` it sends when a socket leaves or disconnects                                                                                    | This server          |

Rule of thumb: if the data is saved in the database, the process that saved it publishes it through Redis. If it only matters while people are looking, it goes direct. A second ws instance would break only the direct ones.

## Rules

- The user comes from the token check, never from a message. A handler adds the name and id itself.
- Check access on every join (`canAccessProject`). Check that a socket is in a room before it sends into it.
- Every message the browser sends has a schema in `packages/validators`. A message that fails is ignored.
- Limit hot messages: pointer moves are at least 50 ms apart, and typing hints 300 ms.
- The heartbeat pings every 30 seconds and closes a client that did not answer, so a sleeping laptop leaves its rooms.
- Name new events on purpose: the web refreshes the board on any name that starts with `ISSUE_` or `SPRINT_`. New live-only events use their own prefix (`PRESENCE_`, `CURSOR_`, `DRAG_`).
- Never log the URL or the token. Join and leave events log at `debug`, and a connect and a disconnect at `info`.

## Env variables it reads

`PORT`, `NODE_ENV`, `SERVICE_NAME`, `LOG_LEVEL`, `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `REDIS_PUBSUB_URL`, `AXIOM_TOKEN` and `AXIOM_DATASET` (logs), `SENTRY_DSN` (errors; empty in development).

## Known limits

- Presence, hints, pointers and drag markers live in the memory of **one** server. A second instance would need a shared store.
- A member removed from a project keeps receiving its events until their connection drops.
- No origin check, and only light rate limits.
- The issue slideover is not in the issue room.

## Links

The browser side: `apps/web/lib/socket-client.ts` and `apps/web/hooks/events/`. Event names: `packages/types/src/events.ts`. Shared rules: the root `AGENTS.md`.
