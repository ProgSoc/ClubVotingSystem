import type { Room } from '@prisma/client';

import { prisma } from './prisma';
import { LiveRoom } from './live-room';

const liveRooms = new Map<string, LiveRoom>();

async function initLiveRooms() {
  const rooms = await LiveRoom.getAllCurrentRooms();
  for (const room of rooms) {
    liveRooms.set(room.id, room);
  }
}

const liveRoomPromise = initLiveRooms();

export interface PublicStaticRoomData {
  id: string;
  shortId: string;
  name: string;
  createdAt: string;
}

function mapRoomToPublicData(room: Room): PublicStaticRoomData {
  return {
    id: room.id,
    shortId: room.shortId,
    name: room.name,
    createdAt: room.createdAt.toISOString(),
  };
}
export async function getLiveRoom(id: string): Promise<LiveRoom | null> {
  await liveRoomPromise;
  const room = liveRooms.get(id);
  if (!room) {
    return null;
  }
  return room;
}

export async function getLiveRoomOrError(id: string): Promise<LiveRoom> {
  const room = await getLiveRoom(id);
  if (!room) {
    throw new Error('Room not found');
  }
  return room;
}

export async function getRoomByShortId(shortId: string): Promise<PublicStaticRoomData | null> {
  const room = await prisma.room.findUnique({ where: { shortId } });
  if (!room) {
    return null;
  }
  return mapRoomToPublicData(room);
}

export async function getRoomById(id: string): Promise<PublicStaticRoomData | null> {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) {
    return null;
  }
  return mapRoomToPublicData(room);
}

export async function createLiveRoom(name: string): Promise<LiveRoom> {
  await liveRoomPromise;
  const room = await LiveRoom.createNewRoom(name);
  liveRooms.set(room.id, room);
  return room;
}
