import { observable } from '@trpc/server/observable';
import { z } from 'zod';

import type { BoardState } from '../live/states';
import { operations } from '../room';
import { withRoomVoterFunctions } from '../room/interaction/user';
import { publicProcedure, router } from '../trpc';
import { userLocation } from '@/db/schema';

export const roomRouter = router({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return operations.createNewRoom(input.name);
    }),

  getRoomByShortId: publicProcedure
    .input(
      z.object({
        shortId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return operations.getRoomByShortId(input.shortId);
    }),

  getRoomById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      return operations.withRoomVoterFunctions(input.id, (fns) => fns.getRoomPublicInfo());
    }),

  joinWaitingList: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        studentEmail: z.string().email(),
        location: z.enum(userLocation["enumValues"]),
      })
    )
    .mutation(async ({ input }) => {
      return operations.withRoomVoterFunctions(input.roomId, (fns) =>
        fns.joinWaitingList({
          location: input.location,
          studentEmail: input.studentEmail,
        })
      );
    }),

  getResults: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return withRoomVoterFunctions(input.roomId, async (fns) => {
        const questions = await fns.getAllQuestionResults();
        return questions.filter((q) => !q.closed);
      });
    }),

  listenBoardEvents: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
      })
    )
    .subscription(async ({ input }) => {
      return observable<BoardState>((emit) => {
        const unsubscribe = operations.subscribeToBoardNotifications(input.roomId, (state) => {
          emit.next(state);
        });

        return unsubscribe;
      });
    }),
});
