# docker/api.Dockerfile
FROM node:20-slim AS base
RUN npm install -g pnpm turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune api --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .

ARG DATABASE_URL
ARG DIRECT_URL
ENV DATABASE_URL=$DATABASE_URL
ENV DIRECT_URL=$DIRECT_URL

RUN echo "DATABASE_URL=$DATABASE_URL" > packages/db/.env && \
    echo "DIRECT_URL=$DIRECT_URL" >> packages/db/.env
    
RUN pnpm turbo run build --filter=api

FROM base AS runner
WORKDIR /app
COPY --from=installer /app .
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]