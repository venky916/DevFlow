import Redis from "ioredis";

const opts = {
    tls: process.env.REDIS_URL?.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
        if (times > 10) return null;
        return Math.min(times * 1000, 10000);
    },
    lazyConnect: true,
};

export const createRedisConnection = () => new Redis(process.env.REDIS_URL!, opts);