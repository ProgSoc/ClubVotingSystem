import * as trpc from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import cors from 'cors';
import EventEmitter from 'events';
import express from 'express';
import ws from 'ws';

import { env } from './env';
import { roomRouter } from './routers/room';
import { roomAdminRouter } from './routers/room-admin';
import { roomVoteRouter } from './routers/room-vote';
import { roomWaitingListRouter } from './routers/room-waiting';

type Post = {
  id: number;
  title: string;
};

const appRouter = trpc
  .router()
  .query('selfUrl', {
    resolve: ({}) => {
      return { url: env.selfUrl };
    },
  })
  .merge('room.', roomRouter)
  .merge('waitingRoom.', roomWaitingListRouter)
  .merge('vote.', roomVoteRouter)
  .merge('admin.', roomAdminRouter);

export type AppRouter = typeof appRouter;
const ee = new EventEmitter();

const app = express();

// Allow CORS and Cookies
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

// created for each request
const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions) => ({}); // no context
type Context = trpc.inferAsyncReturnType<typeof createContext>;
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);
app.listen(8080, () => {
  console.log('Server started on port 8080');
});

const wss = new ws.Server({
  port: 8081,
});
const handler = applyWSSHandler({ wss, router: appRouter });

wss.on('connection', (ws) => {
  console.log(`➕➕ Connection (${wss.clients.size})`);
  ws.once('close', () => {
    console.log(`➖➖ Connection (${wss.clients.size})`);
  });
});
console.log('✅ WebSocket Server listening on ws://localhost:8081');
process.on('SIGTERM', () => {
  console.log('SIGTERM');
  handler.broadcastReconnectNotification();
  wss.close();
});
