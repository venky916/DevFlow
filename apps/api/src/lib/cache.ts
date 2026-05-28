import { redis } from "@devflow/backend-common"
import { logger } from "@devflow/backend-common"

export const TTL = {
    BOARD: 60 * 5, //5 minutes
    MEMBERS: 60 * 10, //10 minutes
}

export const CacheKeys = {
    board: (projectId: string, sprintId: string | null) => `board:${projectId}:${sprintId ?? "backlog"}`,
    projectMembers: (projectId: string) => `members:project:${projectId}`,
    workspaceMembers: (workspaceId: string) => `members:workspace:${workspaceId}`
}

// ─── Get ──────────────────────────────────────────────────────
export const getCache = async <T>(key: string): Promise<T | null> => {
    try {
        const cached = await redis.get(key)
        if (!cached) return null
        return JSON.parse(cached) as T
    } catch (error: any) {
        // Redis down → treat as cache miss → caller goes to DB
        logger.error({ key, error: error.message }, 'Redis GET failed')
        return null
    }
}

// ─── Set ──────────────────────────────────────────────────────
export const setCache = async (key: string, value: any, ttl: number = TTL.BOARD) => {
    try {
        await redis.set(key, JSON.stringify(value), 'EX', ttl)
    } catch (error: any) {
        // Redis down → couldn't cache → next request also misses → hits DB
        // DB already has the data, nothing lost
        logger.error({ key, error: error.message }, 'Redis SET failed')
        // DO NOT throw — cache failure should never break the API
    }
}

// ─── Delete ───────────────────────────────────────────────────
export const deleteCache = async (key: string) => {
    try {
        await redis.del(key)
    } catch (error: any) {
        // Dangerous — stale data stays until TTL expires (max 5-10 min)
        // TTL is our safety net here
        logger.error({ key, error: error.message }, 'Redis DEL failed — stale data until TTL expires')
    }
}


// ─── Delete multiple keys at once ────────────────────────────
export const deleteManyCache = async (keys: string[]) => {
    try {
        if (keys.length === 0) return
        await redis.del(...keys)
    } catch (error: any) {
        logger.error({ keys, error: error.message }, 'Redis DEL multiple failed')
    }
}