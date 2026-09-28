# docker/workers.dev.Dockerfile
FROM node:20-slim
RUN npm install -g pnpm turbo
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
CMD ["pnpm", "--filter", "@devflow/workers", "dev"]