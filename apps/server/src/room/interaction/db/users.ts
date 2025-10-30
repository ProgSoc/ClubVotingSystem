import { nanoid } from "nanoid";
import type { RoomUserSelect, UserLocationEnum } from "@/db/types";
import type { UserLocation, WaitingState } from "../../../dbschema/interfaces";
import {
	UserNotAVoter,
	UserNotFoundError,
	UserNotInWaitingRoom,
} from "../../../errors";
import type { GetStatesUnion } from "../../../state";
import { makeStates, state } from "../../../state";
import { UnreachableError } from "../../../unreachableError";
import {
	dbCreateUser,
	dbGetAllRoomUsers,
	dbGetRoomUserById,
	dbGetRoomUserByVotingKey,
	dbSetUserState,
} from "./queries";

export interface JoinWaitingRoomParams {
	studentEmail: string;
	location: UserLocation;
}

interface WithUserId {
	id: string;
}

interface WithvotingKey extends WithUserId {
	votingKey: string;
}

export interface WaitingRoomUser {
	id: string;
	state: Extract<WaitingState, "Waiting">;
}

export interface RoomUserWithDetails extends WithUserId {
	location: UserLocationEnum;
}

export interface RoomVoterWithDetails extends RoomUserWithDetails {
	votingKey: string;
}

export type RoomUserResolvedState = GetStatesUnion<
	typeof RoomUserResolvedState.enum
>;
export const RoomUserResolvedState = makeStates("rurs", {
	admitted: state<WithvotingKey>(),
	declined: state<WithUserId>(),
	kicked: state<WithUserId>(),
});

export type RoomUserState = GetStatesUnion<typeof RoomUserState.enum>;
export const RoomUserState = makeStates("rus", {
	waiting: state<WithUserId>(),
	admitted: state<WithvotingKey>(),
	declined: state<WithUserId>(),
	kicked: state<WithUserId>(),
});

export interface RoomUsersList {
	waiting: RoomUserWithDetails[];
	admitted: RoomUserWithDetails[];
}

/**
 * This type is distinct from RoomUsersList because RoomUsersList is sent publicly to the admins
 * however it contains votingKeys which must be private.
 */
export interface RoomUsersListWithvotingKeys {
	waiting: RoomUserWithDetails[];
	admitted: RoomVoterWithDetails[];
}

function getRoomStateFromUser(user: RoomUserSelect): RoomUserState {
	switch (user.state) {
		case "Waiting":
			return RoomUserState.waiting({
				id: user.id,
			});
		case "Admitted":
			return RoomUserState.admitted({
				id: user.id,
				// biome-ignore lint/style/noNonNullAssertion: When admitted, it's assumed that user is not null
				votingKey: user.votingKey!,
			});
		case "Declined":
			return RoomUserState.declined({
				id: user.id,
			});
		case "Kicked":
			return RoomUserState.kicked({
				id: user.id,
			});

		default:
			throw new UnreachableError(user.state);
	}
}

export function userRoomStateToResolvedState(
	user: RoomUserState,
): RoomUserResolvedState | null {
	return RoomUserState.match<RoomUserResolvedState | null>(user, {
		waiting: (_state) => null,
		admitted: (state) => RoomUserResolvedState.admitted(state),
		declined: (state) => RoomUserResolvedState.declined(state),
		kicked: (state) => RoomUserResolvedState.kicked(state),
	});
}

export function makeVoterInteractionFunctions(roomId: string) {
	let currentRoomUsersListPromise: Promise<RoomUsersListWithvotingKeys> | null =
		null;

	async function fetchCurrentList(): Promise<RoomUsersListWithvotingKeys> {
		const roomUsers = await dbGetAllRoomUsers(roomId);

		return {
			admitted: roomUsers
				.filter((u) => u.state === "Admitted")
				.map((u) => ({
					id: u.id,
					details: u.userDetails,
					// biome-ignore lint/style/noNonNullAssertion: we know the user has a voting key
					votingKey: u.votingKey!,
				})),
			waiting: roomUsers
				.filter((u) => u.state === "Waiting")
				.map((u) => ({
					id: u.id,
					details: u.userDetails,
				})),
		};
	}

	async function getUser(userId: string): Promise<DbRoomUser> {
		const user = await dbGetRoomUserById(userId);

		if (!user) {
			throw new UserNotFoundError(userId);
		}

		return user;
	}

	const fns = {
		currentRoomUsersListWithvotingKeys: () => {
			if (!currentRoomUsersListPromise) {
				currentRoomUsersListPromise = fetchCurrentList();
			}
			return currentRoomUsersListPromise;
		},

		currentRoomUsersList: async (): Promise<RoomUsersList> => {
			const list = await fns.currentRoomUsersListWithvotingKeys();
			return {
				admitted: list.admitted.map((u) => ({
					id: u.id,
					details: u.details,
				})),
				waiting: list.waiting,
			};
		},

		joinWaitingList: async (params: JoinWaitingRoomParams) => {
			const waitingUser = await dbCreateUser(roomId, {
				studentEmail: params.studentEmail,
				location: params.location,
			});

			currentRoomUsersListPromise = null;

			return { userId: waitingUser.id };
		},

		getUserAdmissionStatus: async (userId: string): Promise<RoomUserState> => {
			return getRoomStateFromUser(await getUser(userId));
		},

		assertUserIsInWaitingRoom: async (userId: string) => {
			const user = await getUser(userId);
			if (user.state !== "Waiting") {
				throw new UserNotInWaitingRoom(userId);
			}
		},

		assertUserAdmitted: async (userId: string) => {
			const user = await getUser(userId);
			if (user.state !== "Admitted") {
				throw new UserNotAVoter(userId);
			}
		},

		admitUser: async (userId: string) => {
			await fns.assertUserIsInWaitingRoom(userId);

			const key = nanoid();
			await dbSetUserState(userId, "Admitted", key);

			return {
				votingKey: key,
			};
		},

		declineUser: async (userId: string) => {
			await fns.assertUserIsInWaitingRoom(userId);
			await dbSetUserState(userId, "Declined", null);
		},

		kickVoter: async (userId: string) => {
			await fns.assertUserAdmitted(userId);
			await dbSetUserState(userId, "Kicked");
		},

		getUserByVotingKey: async (votingKey: string) => {
			return dbGetRoomUserByVotingKey(votingKey);
		},

		getUserById: async (userId: string) => {
			return dbGetRoomUserById(userId);
		},
	};

	return fns;
}
