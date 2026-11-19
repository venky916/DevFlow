import type { Worker } from 'bullmq';

import { logger } from '@devflow/backend-common';

const REDIS_PING_TIMEOUT_MS = 5_000;
const BEAT_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${what} timed out`)), ms).unref(),
        ),
    ]);
}

// Tells Better Stack "the workers are alive" every couple of minutes. If the pings stop,
// Better Stack opens an incident and emails you. A ping is sent only when every worker is
// running AND the queue's Redis answers, so a hung or cut-off process stops pinging too.
// Switched on by HEARTBEAT_URL (a secret: it is never logged). Returns a function that stops it.
export function startHeartbeat(workers: Worker[]): () => void {
    const url = process.env.HEARTBEAT_URL;
    if (!url) {
        logger.info('Heartbeat is off (HEARTBEAT_URL is empty)');
        return () => { };
    }

    // the Redis connection is shared by all workers, so one of them is enough to ask
    const firstWorker = workers[0];
    if (!firstWorker) {
        logger.warn('Heartbeat is off (no workers were given)');
        return () => { };
    }

    const intervalSeconds = Number(process.env.HEARTBEAT_INTERVAL_SECONDS) || 120;
    let healthy = true;
    let beating = false;

    const beat = async () => {
        // a slow check must not pile up behind the next one
        if (beating) return;
        beating = true;
        try {
            if (!workers.every((worker) => worker.isRunning())) throw new Error('a worker is not running');
            // BullMQ types its Redis client narrowly, but it is a full ioredis client with ping()
            const redis = (await firstWorker.client) as unknown as { ping(): Promise<string> };
            await withTimeout(redis.ping(), REDIS_PING_TIMEOUT_MS, 'Redis ping');
            const response = await fetch(url, { signal: AbortSignal.timeout(BEAT_TIMEOUT_MS) });
            if (!response.ok) throw new Error(`the heartbeat service answered ${response.status}`);
            if (!healthy) logger.info('Heartbeat recovered');
            healthy = true;
        } catch (err) {
            // say it once when it starts failing, not on every attempt
            if (healthy) logger.warn({ err }, 'Heartbeat is failing');
            healthy = false;
        } finally {
            beating = false;
        }
    };

    // the first ping waits until the workers are connected, so start-up is not reported as a failure
    void Promise.all(workers.map((worker) => worker.waitUntilReady())).then(() => void beat());
    const timer = setInterval(() => void beat(), intervalSeconds * 1000);
    timer.unref();
    logger.info({ everySeconds: intervalSeconds }, 'Heartbeat started');

    return () => clearInterval(timer);
}