import { QuestionType } from '@prisma/client';
import * as trpc from '@trpc/server';
import { observable } from '@trpc/server/observable';
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

      return observable<RoomUsersList>((emit) => {
        const unsubscribe = room.listenWaitingRoomAdmin((users) => {
          emit.next(users);
        });

        return async () => (await unsubscribe)();
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
  })
  .mutation('kickVoter', {
    input: z.object({
      adminKey: z.string(),
      roomId: z.string(),
      userId: z.string(),
    }),
    async resolve({ input }) {
      const room = await getLiveRoomOrError(input.roomId);
      validateAdminKey(room, input.adminKey);

      await room.kickVoter(input.userId);
    },
  });

const roomQuestionsAdminRouter = trpc
  .router()
  .mutation('createQuestion', {
    input: z.object({
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
