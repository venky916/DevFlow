import Redis from "ioredis"

const opts = {
    tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
        if (times > 10) return null;
        return Math.min(times * 1000, 10000);
    },
    enableOfflineQueue: false,
    lazyConnect: true,
};


class RedisManager {
    private static instance: RedisManager

    private _redis: Redis | null = null;
    private _publisher: Redis | null = null;
    private _subscriber: Redis | null = null;

    private constructor() {
    }

    static getInstance(): RedisManager {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }

    get redis(): Redis {
        if (!this._redis) this._redis = new Redis(process.env.REDIS_URL!, opts);
        return this._redis;
    }
    get publisher(): Redis {
        if (!this._publisher) this._publisher = new Redis(process.env.REDIS_URL!, opts);
        return this._publisher;
    }
    get subscriber(): Redis {
        if (!this._subscriber) this._subscriber = new Redis(process.env.REDIS_URL!, opts);
        return this._subscriber;
    }
}

const redisManager = RedisManager.getInstance();

export const redis = redisManager.redis;
export const publisher = redisManager.publisher;
export const subscriber = redisManager.subscriber;