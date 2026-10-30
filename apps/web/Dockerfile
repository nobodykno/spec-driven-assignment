# Build context: repository root (see docker-compose.yml). Follows SDS §12 / design D9.
FROM node:22.23.4-alpine AS build
ENV HUSKY=0
RUN corepack enable && corepack prepare pnpm@11.28.9 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter "web..." build

FROM nginx:1.31.8-alpine
COPY apps/web/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
