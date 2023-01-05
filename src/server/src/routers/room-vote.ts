import { observable } from '@trpc/server/observable';
import { z } from 'zod';

import type { VoterState } from '../live-room/live-states';
import { questionResponse } from '../live-room/question';
import { getLiveRoomOrError } from '../rooms';
import { publicProcedure, router } from '../trpc';

export const roomVoteRouter = router({
  listen: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        voterId: z.string(),
      })
    )
    .subscription(async ({ ctx, input }) => {
      const room = await getLiveRoomOrError(input.roomId);
      return observable<VoterState>((emit) => {
        const unsubscribe = room.listenVoter(input.voterId, (state) => {
          emit.next(state);
        });

        return async () => (await unsubscribe)();
      });
    }),
  getMyVote: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        voterId: z.string(),
        questionId: z.string(),
      })
    )
    .query(async ({ input: { roomId, voterId, questionId } }) => {
      const room = await getLiveRoomOrError(roomId);
      return room.getVoterVote(voterId, questionId);
    }),
  castVote: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        voterId: z.string(),
        questionId: z.string(),
        response: questionResponse,
      })
    )
    .mutation(async ({ input }) => {
      const room = await getLiveRoomOrError(input.roomId);

      const result = await room.castVote(input.questionId, input.voterId, input.response);
    }),
});
