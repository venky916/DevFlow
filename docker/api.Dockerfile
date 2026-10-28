FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9.0.0 turbo@2.9.8

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune api --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# Prisma 7 reads the database URL from prisma.config.ts even just to generate the client.
# This placeholder is only for that step. No real secret goes into the image.
RUN DIRECT_URL="postgresql://build:build@localhost:5432/build" pnpm --filter @devflow/db run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=installer /app .
USER node
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "--import", "tsx", "src/index.ts"]