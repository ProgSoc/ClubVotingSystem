import { z } from 'zod';

import { getLiveRoomOrError } from '../rooms';
import { publicProcedure, router } from '../trpc';

export const roomWaitingListRouter = router({
  waitResponse: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const room = await getLiveRoomOrError(input.roomId);

      const result = await room.waitForWaitingRoomUser(input.userId);

      if (!result) {
        throw new Error('User not found');
      }

      return result;
    }),
});
