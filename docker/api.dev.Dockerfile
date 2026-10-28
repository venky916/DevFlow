# docker/api.dev.Dockerfile
FROM node:22-slim
RUN npm install -g pnpm@9.0.0 turbo
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
CMD ["pnpm", "--filter", "api", "dev"]