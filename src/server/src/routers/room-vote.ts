import * as trpc from '@trpc/server';
import { z } from 'zod';

import type { VoterState } from '../live-room/live-states';
import { questionResponse } from '../live-room/question';
import { getLiveRoomOrError } from '../rooms';

export const roomVoteRouter = trpc
  .router()
  .subscription('listen', {
    input: z.object({
      roomId: z.string(),
      voterId: z.string(),
    }),
    async resolve({ ctx, input }) {
      const room = await getLiveRoomOrError(input.roomId);
      return new trpc.Subscription<VoterState>(async (emit) => {
        const unsubscribe = await room.listenVoter(input.voterId, (state) => {
          emit.data(state);
        });
        return unsubscribe;
      });
    },
  })
  .query('getMyVote', {
    input: z.object({
      roomId: z.string(),
      voterId: z.string(),
      questionId: z.string(),
    }),
    resolve: async ({ input: { roomId, voterId, questionId } }) => {
      const room = await getLiveRoomOrError(roomId);
      return room.getVoterVote(voterId, questionId);
    },
  })
  .mutation('castVote', {
    input: z.object({
      roomId: z.string(),
      voterId: z.string(),
      questionId: z.string(),
      response: questionResponse,
    }),
    async resolve({ input }) {
      const room = await getLiveRoomOrError(input.roomId);

      const result = await room.castVote(input.questionId, input.voterId, input.response);
    },
  });
