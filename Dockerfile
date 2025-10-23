FROM oven/bun:1.1.17-alpine as builder

WORKDIR /app

COPY package.json bun.lockb ./

COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

RUN bun install

COPY . .

RUN bun server run build && bun web run build

FROM oven/bun:1.1.17-alpine

WORKDIR /app

RUN bun install --global edgedb

COPY --from=builder /app/apps/server/dist ./src
COPY --from=builder /app/apps/server/src/dbschema ./src/dbschema
COPY --from=builder /app/apps/server/edgedb.toml ./edgedb.toml
COPY --from=builder /app/apps/client/dist ./www

ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/www

CMD bun run edgedb migrate && bun apps/server/server.js
