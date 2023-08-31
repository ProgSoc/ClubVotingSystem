FROM node:16.17.0-alpine as builder

WORKDIR /app

COPY package.json yarn.lock ./

COPY src/server/package.json ./src/server/
COPY src/web/package.json ./src/web/

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn server build && yarn web build ./


# Cleanup all dev dependencies
RUN rm -rf src/web/package.json node_modules src/server/node_modules && \
  yarn install --frozen-lockfile --production

FROM node:16.17.0-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/server/dist ./src
COPY --from=builder /app/src/server/package.json ./package.json
COPY --from=builder /app/src/web/dist ./www

ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/www

CMD node src/server.js