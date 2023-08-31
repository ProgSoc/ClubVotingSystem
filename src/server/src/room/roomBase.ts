import { customAlphabet } from 'nanoid';

import { RoomNotFoundError } from '../errors';
import { prisma } from '../prisma';
import type { RoomAdminInfo, RoomPublicInfo } from './types';
import db from '../db/client';
import { room } from '../db/schema';

const makeAdminKeyId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 48);

// Although this is short, it will support having over 1 million rooms
const makePublicShortId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4);

export async function createNewRoom(name: string): Promise<RoomAdminInfo> {
  // Loop until we find a unique public key. If we fail after 100 attempts, then there are serious issues.
  for (let i = 0; i < 100; i++) {
    const createdRooms = await db.insert(room).values({
      id: makeAdminKeyId(),
      name,
      adminKey: makeAdminKeyId(),
      shortId: makePublicShortId(),
    }).returning();

    const firstRoom = createdRooms[0];

    if (!firstRoom) {
      throw new Error('Unexpected error: Failed to create a new room')
    }

    return {
      id: firstRoom.id,
      shortId: firstRoom.shortId,
      name: firstRoom.name,
      adminKey: firstRoom.adminKey,
      createdAt: firstRoom.createdAt,
      closedAt: firstRoom.closedAt,
    };
  }

  throw new Error('Unexpected error: Failed to create a new room');
}

export async function getRoomByShortId(shortId: string): Promise<RoomPublicInfo | null> {
  const fetchedRoom = await db.query.room.findFirst({
    where: (room, {eq}) => eq(room.shortId, shortId),
  })

  if (!fetchedRoom) {
    throw new RoomNotFoundError(shortId);
  }

  return {
    id: fetchedRoom.id,
    shortId: fetchedRoom.shortId,
    name: fetchedRoom.name,
    createdAt: fetchedRoom.createdAt,
    closedAt: fetchedRoom.closedAt,
  };
}
