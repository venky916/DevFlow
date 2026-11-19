import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { logger, registerGracefulShutdown } from '@devflow/backend-common';

import { errorMiddleware } from './middlewares/error.middleware';
import { requestId } from './middlewares/requestId.middleware';
import { requestLogger } from './middlewares/requestLogger.middleware';
import v1Routes from './routes/v1';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(
  cors({
    origin: process.env.BASE_WEB_URL ?? 'http://localhost:3000',
    // lets the browser read the id (the web app is on another domain)
    exposedHeaders: ['X-Request-Id'],
  }),
);
app.use(requestId);
app.use(express.json());

app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use('/api/v1', v1Routes);

//Global error handler
app.use(errorMiddleware);

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'API listening');
});

// stop accepting requests, send the last logs, then exit
registerGracefulShutdown(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
);
