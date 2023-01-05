import { QuestionType } from '@prisma/client';
import { observable } from '@trpc/server/observable';
import { z } from 'zod';

import type { LiveRoom } from '../live-room';
import type { RoomUsersList } from '../live-room/user';
import { getLiveRoomOrError } from '../rooms';
import { publicProcedure, router } from '../trpc';

function validateAdminKey(room: LiveRoom, adminKey: string): void {
  if (room.adminKey !== adminKey) {
    throw new Error('Invalid admin key');
  }
}

const roomUsersAdminRouter = router({
  listenWaitingRoom: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        adminKey: z.string(),
      })
    )
    .subscription(async ({ input }) => {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      return observable<RoomUsersList>((emit) => {
        const unsubscribe = room.listenWaitingRoomAdmin((users) => {
          emit.next(users);
        });

        return async () => (await unsubscribe)();
      });
    }),
  admitUser: publicProcedure
    .input(
      z.object({
        adminKey: z.string(),
        roomId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      await room.admitWaitingRoomUser(input.userId);
    }),
  declineUser: publicProcedure
    .input(
      z.object({
        adminKey: z.string(),
        roomId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      await room.declineWaitingRoomUser(input.userId);
    }),
  kickVoter: publicProcedure
    .input(
      z.object({
        adminKey: z.string(),
        roomId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      await room.kickVoter(input.userId);
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
            type: z.literal(QuestionType.SingleVote),
          }),

          // TODO: Add more types. Having a duplicate here so that zod doesnt complain.
          z.object({
            type: z.literal(QuestionType.SingleVote),
          }),
        ]),
        candidates: z.array(z.string().min(1)).min(1),
      })
    )
    .mutation(async ({ input }) => {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      await room.startNewQuestion({
        question: input.question,
        details: input.details,
        candidates: input.candidates,
      });
    }),

  closeQuestion: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        adminKey: z.string(),
        questionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      await room.closeCurrentQuestion(input.questionId);
    }),
});

export const roomAdminRouter = router({
  users: roomUsersAdminRouter,
  questions: roomQuestionsAdminRouter,
});
