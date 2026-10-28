# Build stage
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY services/auth/package.json services/auth/

RUN pnpm install --frozen-lockfile --ignore-scripts && \
    cd node_modules/esbuild && node install.js || true

COPY packages/shared/ packages/shared/
COPY packages/database/ packages/database/
COPY services/auth/ services/auth/

RUN pnpm --filter @app/shared build && \
    pnpm --filter @app/database build && \
    pnpm --filter auth build

# Production stage
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/dist/ packages/shared/
COPY --from=builder /app/packages/database/package.json /app/packages/database/dist/ packages/database/
COPY --from=builder /app/services/auth/package.json /app/services/auth/dist/ services/auth/

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

ENV NODE_ENV=production
ENV PORT=4001

EXPOSE 4001

CMD ["node", "services/auth/index.js"]
