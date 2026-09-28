import Redis from "ioredis"
import { makeRedisOpts } from "./redis-opts";

const opts = makeRedisOpts(process.env.REDIS_CACHE_URL);

class RedisManager {
    private static instance: RedisManager;
    private _cache: Redis | null = null;

    private constructor() { }
    static getInstance(): RedisManager {
        if (!RedisManager.instance) RedisManager.instance = new RedisManager();
        return RedisManager.instance;
    }

    get cache(): Redis {
        if (!this._cache) this._cache = new Redis(process.env.REDIS_CACHE_URL!, opts);
        return this._cache;
    }
}

export const cache = RedisManager.getInstance().cache;