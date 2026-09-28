// packages/backend-common/src/redis-opts.ts
import type { RedisOptions } from "ioredis";

export const makeRedisOpts = (url: string | undefined): RedisOptions => ({
    tls: url?.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
        if (times > 10) return null;
        return Math.min(times * 1000, 10000);
    },
    lazyConnect: true,
});