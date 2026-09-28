import Redis from "ioredis"
import { makeRedisOpts } from "./redis-opts";

const opts = makeRedisOpts(process.env.REDIS_PUBSUB_URL);

class PubSubManager {
    private static instance: PubSubManager;
    private _publisher: Redis | null = null;
    private _subscriber: Redis | null = null;
    

    private constructor() { }
    static getInstance(): PubSubManager {
        if (!PubSubManager.instance) PubSubManager.instance = new PubSubManager();
        return PubSubManager.instance;
    }

    get publisher(): Redis {
        if (!this._publisher) this._publisher = new Redis(process.env.REDIS_PUBSUB_URL!, opts);
        return this._publisher;
    }
    get subscriber(): Redis {
        if (!this._subscriber) this._subscriber = new Redis(process.env.REDIS_PUBSUB_URL!, opts);
        return this._subscriber;
    }
}

export const publisher = PubSubManager.getInstance().publisher;
export const subscriber = PubSubManager.getInstance().subscriber;