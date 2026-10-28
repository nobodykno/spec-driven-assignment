# Build stage
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY services/api-gateway/package.json services/api-gateway/

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages/shared/ packages/shared/
COPY services/api-gateway/ services/api-gateway/

RUN pnpm --filter @app/shared build && \
    pnpm --filter api-gateway build

# Production stage
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/dist/ packages/shared/
COPY --from=builder /app/services/api-gateway/package.json /app/services/api-gateway/dist/ services/api-gateway/

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "services/api-gateway/index.js"]
