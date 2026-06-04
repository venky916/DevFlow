// import { ConnectionOptions } from "bullmq";

// BullMQ needs ioredis connection options
// NOT the full ioredis client
// export const connection :ConnectionOptions = {
//     url: process.env.REDIS_URL!,
//     // enable TLS for Redis Cloud
//     tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
//     // prevent runaway reconnect loop
//     maxRetriesPerRequest: null, // BullMQ requires null (not a number)
//     retryStrategy(times: number) {
//         if (times > 10) return null; // give up after 10 attempts
//         return Math.min(times * 1000, 10000); // exponential backoff up to 10s
//     },
//     enableOfflineQueue: false, // don't queue commands when disconnected
// }

import { redis } from "@devflow/backend-common";
import type { Redis } from "ioredis";

// reuse the singleton — no new connection opened
export const connection:Redis = redis;