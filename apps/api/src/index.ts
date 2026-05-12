import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requestLogger } from './middlewares/requestLogger.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import v1Routes from './routes/v1';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }));
app.use(express.json());

app.use(requestLogger);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/v1', v1Routes);

//Global error handler
app.use(errorMiddleware);

app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
});