import type { Room } from '@prisma/client';

import { InvalidAdminKeyError, RoomNotFoundError } from '../../../errors';
import { prisma } from '../../../prisma';

export function makeCurrentRoomFunctions(roomId: string) {
  let currentRoomPromise: Promise<Room> | null = null;

  async function fetchCurrentRoom() {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });
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
