import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

// Runs fn with a request id attached. Everything that runs inside fn can read it,
// even after an await, so no function needs an extra parameter.
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId }, fn);
}

// The id of the request (or job) we are inside of, or undefined (for example at start-up).
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
