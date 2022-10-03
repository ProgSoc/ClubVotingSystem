import * as trpc from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import cors from 'cors';
import EventEmitter from 'events';
import express from 'express';
import ws from 'ws';
import { z } from 'zod';

import { publicRouter } from './routers/public';
import { roomRouter } from './routers/room';
import { roomAdminRouter } from './routers/room-admin';
import { roomWaitingListRouter } from './routers/room-waiting';

type Post = {
  id: number;
  title: string;
};

const appRouter = trpc
  .router()
  .merge(publicRouter)
  .merge('room.', roomRouter)
  .merge('waitingRoom.', roomWaitingListRouter)
  .merge('roomAdmin.', roomAdminRouter)

  .subscription('onAdd', {
    resolve({ ctx }) {
      // `resolve()` is triggered for each client when they start subscribing `onAdd`
      // return a `Subscription` with a callback which is triggered immediately
      return new trpc.Subscription<Post>((emit) => {
        emit.data({
          id: -1,
          title: 'hello',
        });
        setInterval(() => {
          emit.data({
            id: Math.random(),
            title: 'hello',
          });
        }, 10000000);
        const onAdd = (data: Post) => {
          // emit data to client
          emit.data(data);
        };
        // trigger `onAdd()` when `add` is triggered in our event emitter
        ee.on('add', onAdd);
        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off('add', onAdd);
        };
      });
    },
  })
  .query('getUser', {
    input: (val: unknown) => {
      if (typeof val === 'string') {
        return val;
      }
      throw new Error(`Invalid input: ${typeof val}`);
    },
    async resolve(req) {
      req.input; // string
      return { id: req.input, name: 'Bilbo' };
    },
  })
  .mutation('createUser', {
    // validate input with Zod
    input: z.object({ name: z.string().min(5) }),
    async resolve(req) {
      // use your ORM of choice
      return {
        test: 1,
        foo: 'a',
      };
    },
  });

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
