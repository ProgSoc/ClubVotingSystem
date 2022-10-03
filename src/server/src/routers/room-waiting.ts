import * as trpc from '@trpc/server';
import { z } from 'zod';

import { getLiveRoomOrError } from '../rooms';

export const roomWaitingListRouter = trpc.router().query('waitResponse', {
  input: z.object({
    roomId: z.string(),
    userId: z.string(),
  }),
  async resolve({ input }) {
    const room = await getLiveRoomOrError(input.roomId);

    const result = await room.waitForWaitingRoomUserAdmitOrDecline(input.userId);

    if (!result) {
      throw new Error('User not found');
    }

    return result;
  },
});
