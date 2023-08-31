import type { Room } from '@prisma/client';

import { InvalidAdminKeyError, RoomNotFoundError } from '../../../errors';
import { prisma } from '../../../prisma';
import db from '../../../db/client';
import { SelectRoom } from '../../../db/migrations/types';

export function makeCurrentRoomFunctions(roomId: string) {
  let currentRoomPromise: Promise<SelectRoom> | null = null;

  async function fetchCurrentRoom() {
    const room = await db.query.room.findFirst({
      where: (r, {eq}) => eq(r.id, roomId),
    })
    if (!room) {
      throw new RoomNotFoundError(roomId);
    }
    return room;
  }

  const fns = {
    getRoom: () => {
      if (!currentRoomPromise) {
        currentRoomPromise = fetchCurrentRoom();
      }
      return currentRoomPromise;
    },

    async authenticateAdminKey(adminKey: string) {
      const room = await fns.getRoom();
      if (room.adminKey !== adminKey) {
        throw new InvalidAdminKeyError();
      }
    },
  };
  return fns;
}
