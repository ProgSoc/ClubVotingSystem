FROM node:22.21-alpine AS base

# Install Bun
RUN apk --no-cache add curl bash
RUN curl -fsSL https://bun.com/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

FROM base AS builder

WORKDIR /app

COPY package.json bun.lockb ./

COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

RUN bun install

COPY . .

RUN bun run build



FROM base

WORKDIR /app

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/src/dbschema ./apps/server/src/dbschema
COPY --from=builder /app/apps/server/gel.toml ./apps/server/gel.toml
COPY --from=builder /app/apps/client/dist ./apps/client/dist

# CD into server app and run gel project initial setup



ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/apps/client/dist

CMD cd apps/server && bunx gel migrate && node --enable-source-maps dist/main.js
