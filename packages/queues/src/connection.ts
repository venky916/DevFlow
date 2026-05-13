import { ConnectionOptions } from "bullmq";

// BullMQ needs ioredis connection options
// NOT the full ioredis client
export const connection :ConnectionOptions = {
    url: process.env.REDIS_URL!,
    // enable TLS for Redis Cloud
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
}