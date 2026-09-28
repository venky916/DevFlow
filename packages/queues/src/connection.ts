import Redis from "ioredis";
import { makeRedisOpts } from "@devflow/backend-common";

export const createRedisConnection = () => new Redis(process.env.REDIS_QUEUE_URL!, makeRedisOpts(process.env.REDIS_QUEUE_URL));