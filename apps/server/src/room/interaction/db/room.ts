import { InvalidAdminKeyError, RoomNotFoundError } from '../../../errors';
import type { DbRoom } from './queries';
import { dbGetRoomById } from './queries';

export function makeCurrentRoomFunctions(roomId: string) {
  let currentRoomPromise: Promise<DbRoom> | null = null;

  async function fetchCurrentRoom() {
    const room = await dbGetRoomById(roomId);

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
