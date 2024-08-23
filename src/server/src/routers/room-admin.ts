import { observable } from '@trpc/server/observable';
import { z } from 'zod';

import type { RoomUsersList } from '../live/user';
import { operations } from '../room';
import { publicProcedure, router } from '../trpc';
import type { QuestionFormat } from '../dbschema/interfaces';

const roomUsersAdminRouter = router({
  listenWaitingRoom: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        adminKey: z.string(),
      }),
    )
    .subscription(async ({ input }) => {
      return observable<RoomUsersList>((emit) => {
        const unsubscribe = operations.subscribeToUserListNotifications(input.roomId, input.adminKey, users =>
          emit.next(users));

        return unsubscribe;
      });
    }),
  admitUser: publicProcedure
    .input(
      z.object({
        adminKey: z.string(),
        roomId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await operations.withRoomAdminFunctions(input.roomId, input.adminKey, fns => fns.admitUser(input.userId));
    }),
  declineUser: publicProcedure
    .input(
      z.object({
        adminKey: z.string(),
        roomId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await operations.withRoomAdminFunctions(input.roomId, input.adminKey, fns => fns.declineUser(input.userId));
    }),
  kickVoter: publicProcedure
    .input(
      z.object({
        adminKey: z.string(),
        roomId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await operations.withRoomAdminFunctions(input.roomId, input.adminKey, fns => fns.kickVoter(input.userId));
    }),
});

export const roomQuestionsAdminRouter = router({
  createQuestion: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        adminKey: z.string(),
        question: z.string().min(1),
        details: z.union([
          z.object({
            type: z.literal('SingleVote' satisfies QuestionFormat),
          }),

          // TODO: Add more types. Having a duplicate here so that zod doesnt complain.
          z.object({
            type: z.literal('PreferentialVote' satisfies QuestionFormat),
            maxElected: z.coerce.number().positive().default(1).catch(1),
          }),
        ]),
        candidates: z.array(z.string().min(1)).min(1),
      }),
    )
    .mutation(async ({ input }) => {
      await operations.withRoomAdminFunctions(input.roomId, input.adminKey, fns =>
        fns.startNewQuestion({
          question: input.question,
          details: input.details,
          candidates: input.candidates,
        }));
    }),

  closeQuestion: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        adminKey: z.string(),
        questionId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await operations.withRoomAdminFunctions(input.roomId, input.adminKey, fns => fns.closeQuestion());
    }),
});

export const roomAdminRouter = router({
  users: roomUsersAdminRouter,
  questions: roomQuestionsAdminRouter,
});
