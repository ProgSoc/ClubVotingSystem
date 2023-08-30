import { observable } from '@trpc/server/observable';
import { z } from 'zod';

import { questionResponse } from '../live/question';
import type { VoterState } from '../live/states';
import { operations } from '../room';
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
      return observable<VoterState>((emit) => {
        const unsubscribe = operations.subscribeToVoterNotifications(input.roomId, input.voterId, (state) => {
          emit.next(state);
        });

        return unsubscribe;
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
      return operations.withRoomVoterFunctions(roomId, (fns) => fns.getQuestionVote(questionId, voterId));
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
      return operations.withRoomVoterFunctions(input.roomId, (fns) =>
        fns.castVote(input.voterId, input.questionId, input.response)
      );
    }),
});
