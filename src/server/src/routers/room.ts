import { UserLocation } from '@prisma/client';
import * as trpc from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { z } from 'zod';

import type { BoardState } from '../live-room/live-states';
import { getAllResultsForRoom } from '../live-room/question';
import type { PublicStaticRoomData } from '../rooms';
import { createLiveRoom, getLiveRoomOrError, getRoomById, getRoomByShortId } from '../rooms';

export const roomRouter = trpc
  .router()
  .mutation('create', {
    input: z.object({
      name: z.string().min(1),
    }),
    async resolve({ input }) {
      const room = await createLiveRoom(input.name);
      const publicData: PublicStaticRoomData = {
        id: room.id,
        shortId: room.shortId,
        name: room.name,
        createdAt: room.createdAt.toISOString(),
      };
      return {
        ...publicData,
        adminKey: room.adminKey,
      };
    },
  })
  .query('getRoomByShortId', {
    input: z.object({
      shortId: z.string(),
    }),
    async resolve({ input }) {
      const room = await getRoomByShortId(input.shortId);
      return room;
    },
  })
  .query('getRoomById', {
    input: z.object({
      id: z.string(),
    }),
    async resolve({ input }) {
      const room = await getRoomById(input.id);
      return room;
    },
  })
  .mutation('joinWaitingList', {
    input: z.object({
      roomId: z.string(),
      studentEmail: z.string().email(),
      location: z.nativeEnum(UserLocation),
    }),
    async resolve({ input }) {
      const room = await getLiveRoomOrError(input.roomId);

      const user = await room.joinWaitingRoom({
        studentEmail: input.studentEmail,
        location: input.location,
      });
      return user;
    },
  })
  .query('getResults', {
    input: z.object({
      roomId: z.string(),
    }),
    async resolve({ input }) {
      return getAllResultsForRoom(input.roomId);
    },
  })
  .subscription('listenBoardEvents', {
    input: z.object({
      roomId: z.string(),
    }),
    async resolve({ input }) {
      const room = await getLiveRoomOrError(input.roomId);
      return observable<BoardState>((emit) => {
        const unsubscribe = room.listenBoard((state) => {
          emit.next(state);
        });
        return async () => (await unsubscribe)();
      });
    },
  });
