import { observable } from '@trpc/server/observable';
import { z } from 'zod';

import type { VoterState } from '../live-room/live-states';
import { questionResponse } from '../live-room/question';
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

      // const room = await getLiveRoomOrError(input.roomId);
      // return observable<VoterState>((emit) => {
      //   const unsubscribe = room.listenVoter(input.voterId, (state) => {
      //     emit.next(state);
      //   });

      //   return async () => (await unsubscribe)();
      // });
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
      // const room = await getLiveRoomOrError(roomId);
      // return room.getVoterVote(voterId, questionId);
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
      // const room = await getLiveRoomOrError(input.roomId);
      // const result = await room.castVote(input.questionId, input.voterId, input.response);
    }),
});
