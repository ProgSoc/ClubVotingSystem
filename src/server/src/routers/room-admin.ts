import { QuestionType } from '@prisma/client';
import * as trpc from '@trpc/server';
import { z } from 'zod';

import type { LiveRoom } from '../live-room';
import type { RoomUsersList } from '../live-room/user';
import { getLiveRoomOrError } from '../rooms';

function validateAdminKey(room: LiveRoom, adminKey: string): void {
  if (room.adminKey !== adminKey) {
    throw new Error('Invalid admin key');
  }
}

const roomUsersAdminRouter = trpc
  .router()
  .subscription('listenWaitingRoom', {
    input: z.object({
      roomId: z.string(),
      adminKey: z.string(),
    }),
    async resolve({ input }) {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      return new trpc.Subscription<RoomUsersList>(async (emit) => {
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

const roomQuestionsAdminRouter = trpc
  .router()
  .mutation('createQuestion', {
    input: z.object({
      roomId: z.string(),
      adminKey: z.string(),
      question: z.string().refine((s) => s.length > 0, { message: 'Question must not be empty' }),
      details: z.union([
        z.object({
          type: z.literal(QuestionType.SingleVote),
        }),

        // TODO: Add more types. Having a duplicate here so that zod doesnt complain.
        z.object({
          type: z.literal(QuestionType.SingleVote),
        }),
      ]),
      candidates: z
        .array(z.string().refine((s) => s.length > 0, { message: 'Candidate must not be empty' }))
        .refine((arr) => arr.length > 1, { message: 'Must have at least 2 candidates' }),
    }),
    async resolve({ input }) {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      await room.startNewQuestion({
        question: input.question,
        details: input.details,
        candidates: input.candidates,
      });
    },
  })
  .mutation('closeQuestion', {
    input: z.object({
      roomId: z.string(),
      adminKey: z.string(),
      questionId: z.string(),
    }),
    async resolve({ input }) {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      await room.closeCurrentQuestion(input.questionId);
    },
  });

export const roomAdminRouter = trpc
  .router()
  .merge('users.', roomUsersAdminRouter)
  .merge('questions.', roomQuestionsAdminRouter);
