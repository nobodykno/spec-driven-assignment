# Build context: repository root (see docker-compose.yml). Follows SDS §12 / design D9.
FROM node:22.23.4-alpine AS build
ENV HUSKY=0
RUN corepack enable && corepack prepare pnpm@11.28.9 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter "api-gateway..." build
RUN pnpm --filter api-gateway deploy --prod /out

FROM node:22.23.4-alpine
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
