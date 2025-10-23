import { z } from 'zod';
import { operations } from '../room';
import { withRoomVoterFunctions } from '../room/interaction/user';
import { publicProcedure, router } from '../trpc';
import type { UserLocation } from '../dbschema/interfaces';

export const roomRouter = router({
  createNewRoom: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      return operations.createNewRoom(input.name);
    }),

  getRoomByShortId: publicProcedure
    .input(
      z.object({
        shortId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return operations.getRoomByShortId(input.shortId);
    }),

  getRoomById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return operations.withRoomVoterFunctions(input.id, fns => fns.getRoomPublicInfo());
    }),

  joinWaitingList: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        email: z.string().email(),
        location: z.enum<UserLocation, readonly [UserLocation, ...UserLocation[]]>(['InPerson', 'Online', 'Proxy']),
      }),
    )
    .mutation(async ({ input }) => {
      return operations.withRoomVoterFunctions(input.roomId, fns =>
        fns.joinWaitingList({
          location: input.location,
          studentEmail: input.email,
        }));
    }),

  getResults: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return withRoomVoterFunctions(input.roomId, async (fns) => {
        const questions = await fns.getAllQuestionResults();
        return questions.filter(q => q.closed);
      });
    }),

  listenBoardEvents: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
      }),
    )
    .subscription(async ({ input }) => operations.subscribeToBoardNotifications(input.roomId))
    
});
