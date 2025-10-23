import { customAlphabet } from "nanoid";

import { RoomNotFoundError } from "../errors";
import { dbCreateRoom, dbRoomFindByShortId } from "./interaction/db/queries";
import type { RoomAdminInfo, RoomPublicInfo } from "./types";

const makeAdminKeyId = customAlphabet(
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
	48,
);

// Although this is short, it will support having over 1 million rooms
const makePublicShortId = customAlphabet(
	"0123456789abcdefghijklmnopqrstuvwxyz",
	4,
);

export async function createNewRoom(name: string): Promise<RoomAdminInfo> {
	// Loop until we find a unique public key. If we fail after 100 attempts, then there are serious issues.
	for (let i = 0; i < 100; i++) {
		const room = await dbCreateRoom({
			name,
			adminKey: makeAdminKeyId(),
			shortId: makePublicShortId(),
		});

		return {
			id: room.id,
			shortId: room.shortId,
			name: room.name,
			adminKey: room.adminKey,
			createdAt: room.createdAt.toISOString(),
			closedAt: room.closedAt?.toISOString() ?? null,
		};
	}

	throw new Error("Unexpected error: Failed to create a new room");
}

export async function getRoomByShortId(
	shortId: string,
): Promise<RoomPublicInfo | null> {
	const room = await dbRoomFindByShortId(shortId);

	if (!room) {
		throw new RoomNotFoundError(shortId);
	}

	return {
		id: room.id,
		shortId: room.shortId,
		name: room.name,
		createdAt: room.createdAt.toISOString(),
		closedAt: room.closedAt?.toISOString() ?? null,
	};
}
