import * as trpc from '@trpc/server';
import { z } from 'zod';

import { createLiveRoom } from '../rooms';

export const publicRouter = trpc.router().mutation('createRoom', {
  input: z.object({
    name: z.string().refine((s) => s.length > 0, { message: 'Name must not be empty' }),
  }),
  async resolve({ input }) {
    const room = await createLiveRoom(input.name);
    return {
      id: room.id,
      shortId: room.shortId,
      adminKey: room.adminKey,
      name: room.name,
    };
  },
});
