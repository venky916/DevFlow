import { ConnectionOptions } from "bullmq";

export const connection :ConnectionOptions ={
    url: process.env.REDIS_URL!,
    // enable TLS for Redis Cloud
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
}