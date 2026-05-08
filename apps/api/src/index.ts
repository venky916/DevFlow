import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requestLogger } from './middlewares/requestLogger.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import projectRoutes from './routes/project.routes';
import sprintRoutes from './routes/sprint.routes';
import issueRoutes from './routes/issue.routes';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }));
app.use(express.json());

app.use(requestLogger);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use("/workspace", workspaceRoutes);
app.use('/workspaces/:workspaceId/projects', projectRoutes);
app.use('/projects', projectRoutes);
app.use("/projects/:id/sprints", sprintRoutes);
app.use("/sprints",sprintRoutes)
app.use("/projects/:id/issues", issueRoutes);
app.use("/issues", issueRoutes);

//Global error handler
app.use(errorMiddleware);

app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
});