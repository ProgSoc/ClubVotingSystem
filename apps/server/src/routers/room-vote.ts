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
        votingKey: z.string(),
      }),
    )
    .subscription(async ({ ctx, input }) => operations.subscribeToVoterNotifications(input.roomId, input.votingKey)),
  getMyVote: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        votingKey: z.string(),
        questionId: z.string(),
      }),
    )
    .query(async ({ input: { roomId, votingKey, questionId } }) => {
      return operations.withRoomVoterFunctions(roomId, fns => fns.getQuestionVote(questionId, votingKey));
    }),
  castVote: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        votingKey: z.string(),
        questionId: z.string(),
        response: questionResponse,
      }),
    )
    .mutation(async ({ input }) => {
      return operations.withRoomVoterFunctions(input.roomId, fns =>
        fns.castVote(input.votingKey, input.questionId, input.response));
    }),
});
