# Base stage
FROM node:22.21-alpine AS base
RUN apk --no-cache add curl bash
RUN curl -fsSL https://bun.com/install | bash
ENV PATH="/root/.bun/bin:${PATH}"
WORKDIR /app


FROM base AS install

# Development dependencies
COPY package.json bun.lock /temp/dev/
COPY apps/server/package.json /temp/dev/apps/server/
COPY apps/client/package.json /temp/dev/apps/client/
RUN cd /temp/dev && bun install --frozen-lockfile

# Production dependencies
COPY package.json bun.lock /temp/prod/
COPY apps/server/package.json /temp/prod/apps/server/
COPY apps/client/package.json /temp/prod/apps/client/
RUN cd /temp/prod && bun install --frozen-lockfile --production --filter "server"

FROM base as prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=install /temp/dev/apps/server/node_modules apps/server/node_modules
COPY --from=install /temp/dev/apps/client/node_modules apps/client/node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

# Build stage
FROM base
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=install /temp/prod/apps/server/node_modules apps/server/node_modules
COPY --from=prerelease /app/apps/server/dist ./apps/server/dist
COPY --from=prerelease /app/apps/server/src/dbschema ./apps/server/src/dbschema
COPY --from=prerelease /app/apps/server/gel.toml ./apps/server/gel.toml
COPY --from=prerelease /app/apps/client/dist ./apps/client/dist

ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/apps/client/dist

CMD cd apps/server && bun x gel migrate && node --enable-source-maps dist/main.js
