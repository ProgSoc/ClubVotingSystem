FROM oven/bun:1.1.17-alpine as builder

WORKDIR /app

COPY package.json bun.lockb ./

COPY src/server/package.json ./src/server/
COPY src/web/package.json ./src/web/

RUN bun install

COPY . .

RUN bun server run build && bun web run build

FROM oven/bun:1.1.17-alpine

WORKDIR /app

RUN bun install --global edgedb

COPY --from=builder /app/src/server/dist ./src
COPY --from=builder /app/src/server/src/dbschema ./src/dbschema
COPY --from=builder /app/src/server/edgedb.toml ./edgedb.toml
COPY --from=builder /app/src/web/dist ./www

ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/www

CMD bun run edgedb migrate && bun src/server.js
