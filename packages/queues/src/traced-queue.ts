import { Queue, type QueueOptions } from 'bullmq';

import { getRequestId } from '@devflow/backend-common';

// Job data that can carry the id of the request that created the job
export interface WithRequestId {
  requestId?: string;
}

// copies the current request id onto a job's data, unless the data already has one
function stamp<D>(data: D): D {
  const requestId = (data as WithRequestId).requestId ?? getRequestId();
  return requestId ? ({ ...data, requestId } as D) : data;
}

// A normal BullMQ queue whose add() and addBulk() copy the current request id onto every job.
// Call sites do not change: they still call queue.add(name, data).
export function createTracedQueue<T extends WithRequestId>(
  name: string,
  options: QueueOptions,
): Queue<T> {
  const queue = new Queue<T>(name, options);
  const add = queue.add.bind(queue);
  const addBulk = queue.addBulk.bind(queue);

  queue.add = ((...args: Parameters<typeof add>) => {
    const [jobName, data, opts] = args;
    return add(jobName, stamp(data), opts);
  }) as typeof queue.add;

  queue.addBulk = ((jobs: Parameters<typeof addBulk>[0]) =>
    addBulk(jobs.map((job) => ({ ...job, data: stamp(job.data) })))) as typeof queue.addBulk;

  return queue;
}
