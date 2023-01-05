import { UserLocation } from '@prisma/client';
import { observable } from '@trpc/server/observable';
import { z } from 'zod';

import type { BoardState } from '../live-room/live-states';
import { getAllResultsForRoom } from '../live-room/question';
import type { PublicStaticRoomData } from '../rooms';
import { createLiveRoom, getLiveRoomOrError, getRoomById, getRoomByShortId } from '../rooms';
import { publicProcedure, router } from '../trpc';

export const roomRouter = router({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
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
    }),

  getRoomByShortId: publicProcedure
    .input(
      z.object({
        shortId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const room = await getRoomByShortId(input.shortId);
      return room;
    }),

  getRoomById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const room = await getRoomById(input.id);
      return room;
    }),

  joinWaitingList: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        studentEmail: z.string().email(),
        location: z.nativeEnum(UserLocation),
      })
    )
    .mutation(async ({ input }) => {
      const room = await getLiveRoomOrError(input.roomId);

      const user = await room.joinWaitingRoom({
        studentEmail: input.studentEmail,
        location: input.location,
      });
      return user;
    }),

  getResults: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return getAllResultsForRoom(input.roomId);
    }),

  listenBoardEvents: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
      })
    )
    .subscription(async ({ input }) => {
      const room = await getLiveRoomOrError(input.roomId);
      return observable<BoardState>((emit) => {
        const unsubscribe = room.listenBoard((state) => {
          emit.next(state);
        });
        return async () => (await unsubscribe)();
      });
    }),
});
