FROM node:16.17.0-alpine as builder

WORKDIR /app

COPY package.json yarn.lock ./
COPY src/server/package.json ./src/server/
COPY src/web/package.json ./src/web/

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn server prisma generate && yarn server build && yarn web build && mv node_modules/.prisma ./


# Cleanup all dev dependencies
RUN rm -rf src/web/package.json node_modules src/server/node_modules && \
  yarn install --frozen-lockfile --production

# Hack for greatly reducing the size of the image. For some reason I couldn't find
# a cleaner way to do this.
RUN \
  rm ./node_modules/.prisma/client/libquery_engine-linux-musl.so.node && \
  rm ./node_modules/prisma/libquery_engine-linux-musl.so.node && \
  rm ./node_modules/@prisma/engines/introspection-engine-linux-musl && \
  rm ./node_modules/@prisma/engines/prisma-fmt-linux-musl && \
  rm ./node_modules/@prisma/engines/libquery_engine-linux-musl.so.node && \
  rm ./node_modules/@prisma/engines/migration-engine-linux-musl

FROM node:16.17.0-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/server/dist ./src
COPY --from=builder /app/src/server/package.json ./package.json
COPY --from=builder /app/src/web/dist ./www

ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/www

CMD yarn prisma migrate deploy && node src/server.js