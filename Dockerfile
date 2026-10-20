# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY angular.json tsconfig*.json .postcssrc.json ./
COPY src ./src
COPY public ./public
RUN pnpm exec ng build --configuration production

FROM node:24-alpine
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --prod
COPY server.js ./
COPY server ./server
COPY --from=build /app/dist ./dist
USER node
EXPOSE 7006
# probes over https when SSL_CERT_PATH is set (as behind nginx), http otherwise
HEALTHCHECK --interval=15s --timeout=4s --start-period=10s --retries=5 \
  CMD ["node", "server/healthcheck.js"]
CMD ["node", "server.js"]
