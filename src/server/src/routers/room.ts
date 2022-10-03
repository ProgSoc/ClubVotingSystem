import { Location } from '@prisma/client';
import * as trpc from '@trpc/server';
import { z } from 'zod';

import { getLiveRoomOrError, getRoomIdByShortId } from '../rooms';

export const roomRouter = trpc
  .router()
  .query('getRoomByShortId', {
    input: z.object({
      shortId: z.string(),
    }),
    async resolve({ input }) {
      const roomId = await getRoomIdByShortId(input.shortId);
      return { roomId };
    },
  })
  .mutation('joinWaitingList', {
    input: z.object({
      roomId: z.string(),
      studentEmail: z.string().refine((s) => s.length > 0, { message: 'Email must not be empty' }),
      location: z.nativeEnum(Location),
    }),
    async resolve({ input }) {
      const room = await getLiveRoomOrError(input.roomId);

      const user = await room.joinWaitingRoom({
        studentEmail: input.studentEmail,
        location: input.location,
      });
      return user;
    },
  });
