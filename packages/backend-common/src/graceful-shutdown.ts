import { captureError, flushErrors } from './error-tracking';
import { flushLogs, logger } from './logger';

const FORCE_EXIT_AFTER_MS = 8000;

// Stops the process cleanly on SIGTERM and SIGINT (a deploy, docker stop, Ctrl+C),
// and reports a crash (logs and Sentry) before the process exits. `close` stops the app's own work.
export function registerGracefulShutdown(close: () => Promise<void> | void) {
  let shuttingDown = false;

  async function shutdown(reason: string, exitCode: number) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ reason }, 'Shutting down');

    // never wait forever: docker kills a container that takes longer than 10 seconds
    setTimeout(() => process.exit(exitCode), FORCE_EXIT_AFTER_MS).unref();

    try {
      await close();
    } catch (err) {
      logger.error({ err }, 'Error while shutting down');
    }
    await Promise.all([flushLogs(), flushErrors()]);
    process.exit(exitCode);
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM', 0));
  process.on('SIGINT', () => void shutdown('SIGINT', 0));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    captureError(err, { kind: 'uncaughtException' });
    void shutdown('uncaughtException', 1);
  });
  process.on('unhandledRejection', (err) => {
    logger.fatal({ err }, 'Unhandled promise rejection');
    captureError(err, { kind: 'unhandledRejection' });
    void shutdown('unhandledRejection', 1);
  });
}
