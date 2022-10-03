import * as trpc from '@trpc/server';
import { z } from 'zod';

import type { LiveRoom } from '../live-room';
import type { WaitingRoomUserWithDetails } from '../live-room/user';
import { getLiveRoomOrError } from '../rooms';

function validateAdminKey(room: LiveRoom, adminKey: string): void {
  if (room.adminKey !== adminKey) {
    throw new Error('Invalid admin key');
  }
}

export const roomAdminRouter = trpc
  .router()
  .subscription('listenWaitingRoom', {
    input: z.object({
      roomId: z.string(),
      adminKey: z.string(),
    }),
    async resolve({ input }) {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      return new trpc.Subscription<WaitingRoomUserWithDetails[]>(async (emit) => {
        const unsubscribe = await room.listenWaitingRoomAdmin((users) => {
          emit.data(users);
        });

        return unsubscribe;
      });
    },
  })
  .mutation('admitUser', {
    input: z.object({
      adminKey: z.string(),
      roomId: z.string(),
      userId: z.string(),
    }),
    async resolve({ input }) {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      await room.admitWaitingRoomUser(input.userId);
    },
  })
  .mutation('declineUser', {
    input: z.object({
      adminKey: z.string(),
      roomId: z.string(),
      userId: z.string(),
    }),
    async resolve({ input }) {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      await room.declineWaitingRoomUser(input.userId);
    },
  });
