import type { RoomUser, UserLocation } from '@prisma/client';
import { WaitingState } from '@prisma/client';

import { UserNotAVoter, UserNotFoundError, UserNotInWaitingRoom } from '../../../errors';
import { prisma } from '../../../prisma';
import type { GetStatesUnion } from '../../../state';
import { makeStates, state } from '../../../state';
import { UnreachableError } from '../../../unreachableError';
import db from '../../../db/client';
import { roomUser, voter } from '../../../db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export interface JoinWaitingRoomParams {
  studentEmail: string;
  location: UserLocation;
}

interface WithUserId {
  id: string;
}

interface WithVoterId extends WithUserId {
  voterId: string;
}

export interface WaitingRoomUser {
  id: string;
  state: typeof WaitingState['Waiting'];
}

interface UserPrivateDetails {
  studentEmail: string;
  location: UserLocation;
}

export interface RoomUserWithDetails extends WithUserId {
  details: UserPrivateDetails;
}

export interface RoomVoterWithDetails extends RoomUserWithDetails {
  voterId: string;
}

export type RoomUserResolvedState = GetStatesUnion<typeof RoomUserResolvedState.enum>;
export const RoomUserResolvedState = makeStates('rurs', {
  admitted: state<WithVoterId>(),
  declined: state<WithUserId>(),
  kicked: state<WithUserId>(),
});

export type RoomUserState = GetStatesUnion<typeof RoomUserState.enum>;
export const RoomUserState = makeStates('rus', {
  waiting: state<WithUserId>(),
  admitted: state<WithVoterId>(),
  declined: state<WithUserId>(),
  kicked: state<WithUserId>(),
});

export interface RoomUsersList {
  waiting: RoomUserWithDetails[];
  admitted: RoomUserWithDetails[];
}

/**
 * This type is distinct from RoomUsersList because RoomUsersList is sent publicly to the admins
 * however it contains voterIds which must be private.
 */
export interface RoomUsersListWithVoterIds {
  waiting: RoomUserWithDetails[];
  admitted: RoomVoterWithDetails[];
}

function getRoomStateFromUser(user: RoomUser): RoomUserState {
  switch (user.state) {
    case WaitingState.Waiting:
      return RoomUserState.waiting({
        id: user.id,
      });
    case WaitingState.Admitted:
      return RoomUserState.admitted({
        id: user.id,

        // When admitted, it's assumed that user is not null
        voterId: user.voterId!,
      });
    case WaitingState.Declined:
      return RoomUserState.declined({
        id: user.id,
      });
    case WaitingState.Kicked:
      return RoomUserState.kicked({
        id: user.id,
      });

    default:
      throw new UnreachableError(user.state);
  }
}

export function userRoomStateToResolvedState(user: RoomUserState): RoomUserResolvedState | null {
  return RoomUserState.match<RoomUserResolvedState | null>(user, {
    waiting: (state) => null,
    admitted: (state) => RoomUserResolvedState.admitted(state),
    declined: (state) => RoomUserResolvedState.declined(state),
    kicked: (state) => RoomUserResolvedState.kicked(state),
  });
}

export function makeVoterInteractionFunctions(roomId: string) {
  let currentRoomUsersListPromise: Promise<RoomUsersListWithVoterIds> | null = null;

  async function fetchCurrentList(): Promise<RoomUsersListWithVoterIds> {
    const addmitted = await db
      .select({
        id: roomUser.id,
        details: {
          studentEmail: roomUser.studentEmail,
          location: roomUser.location,
        },
        voterId: roomUser.voterId,
      })
      .from(roomUser)
      .where(and(eq(roomUser.roomId, roomId), eq(roomUser.state, 'Admitted'), isNotNull(roomUser.voterId)));

    const waiting = await db
      .select({
        id: roomUser.id,
        details: {
          studentEmail: roomUser.studentEmail,
          location: roomUser.location,
        },
      })
      .from(roomUser)
      .where(and(eq(roomUser.roomId, roomId), eq(roomUser.state, 'Waiting')));

    return {
      admitted: addmitted as RoomVoterWithDetails[], // TODO: Fix null check
      waiting: waiting,
    };
  }

  async function getUser(userId: string): Promise<RoomUser> {
    const user = await db.query.roomUser.findFirst({
      where: eq(roomUser.id, userId),
    });

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    return user;
  }

  const fns = {
    currentRoomUsersListWithVoterIds: () => {
      if (!currentRoomUsersListPromise) {
        currentRoomUsersListPromise = fetchCurrentList();
      }
      return currentRoomUsersListPromise;
    },

    currentRoomUsersList: async (): Promise<RoomUsersList> => {
      const list = await fns.currentRoomUsersListWithVoterIds();
      return {
        admitted: list.admitted.map((u) => ({
          id: u.id,
          details: u.details,
        })),
        waiting: list.waiting,
      };
    },

    joinWaitingList: async (params: JoinWaitingRoomParams) => {
      const waitingUsers = await db.insert(roomUser).values({
        studentEmail: params.studentEmail,
        location: params.location,
        roomId,
        state: WaitingState.Waiting,
        id: createId()
      }).returning()

      const waitingUser = waitingUsers[0]

      if (!waitingUser) {
        throw new Error('Failed to create waiting user')
      }

      currentRoomUsersListPromise = null;

      return { userId: waitingUser.id };
    },

    getUserAdmissionStatus: async (userId: string): Promise<RoomUserState> => {
      const user = await db.query.roomUser.findFirst({
        where: eq(roomUser.id, userId)
      })

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      return getRoomStateFromUser(user);
    },

    admitUser: async (userId: string) => {
      /**
       * Remember that everything here is wrapped in a transaction.
       */
      return db.transaction(async (tx): Promise<{ voterId: string }> => {
        const user = await tx.query.roomUser.findFirst({
          where: eq(roomUser.id, userId),
        })

        if (!user) {
          throw new UserNotFoundError(userId);
        }

        if (user.state !== "Waiting") {
          throw new UserNotInWaitingRoom(userId);
        }

        const [updatedWaitingRoomUser] = await tx.update(roomUser).set({
          state: "Admitted",
        }).where(eq(roomUser.id, userId)).returning()

        if (!updatedWaitingRoomUser) {
          throw new Error('Failed to update waiting room user')
        }

        // Create a voter for the user
        const [firstVoter] = await tx.insert(voter).values({
          id: updatedWaitingRoomUser.id,
        }).returning({voterId: voter.id})

        if (!firstVoter) {
          throw new Error('Failed to create voter')
        }

        return {
          // We assume that the voter was created
          voterId: firstVoter.voterId,
        };
      });
    },

    declineUser: async (userId: string) => {
      return db.transaction(async (tx) => {
        const user = await tx.query.roomUser.findFirst({
          where: eq(roomUser.id, userId),
        })

        if (!user) {
          throw new UserNotFoundError(userId);
        }

        if (user.state !== "Waiting") {
          throw new UserNotInWaitingRoom(userId);
        }

        const [updatedWaitingRoomUser] = await tx.update(roomUser).set({
          state: "Declined",
        }).where(eq(roomUser.id, userId)).returning()

        if (!updatedWaitingRoomUser) {
          throw new Error('Failed to update waiting room user')
        }
      })
    },

    kickVoter: async (userId: string) => {
      return db.transaction(async (tx) => {
        const user = await tx.query.roomUser.findFirst({
          where: eq(roomUser.id, userId),
        })

        if (!user) {
          throw new UserNotFoundError(userId);
        }

        if (user.state !== "Admitted") {
          throw new UserNotAVoter(userId);
        }

        const [updatedWaitingRoomUser] = await tx.update(roomUser).set({
          state: "Kicked",
        }).where(eq(roomUser.id, userId)).returning()

        if (!updatedWaitingRoomUser) {
          throw new Error('Failed to update waiting room user')
        }
      })
    },

    getVoterByUserId: async (userId: string) => {
      return db.query.voter.findFirst({
        where: eq(voter.id, userId),
      });
    },

    getUserByVoterId: async (voterId: string) => {
      return db.query.roomUser.findFirst({
        where: eq(roomUser.voterId, voterId),
      });
    },
  };

  return fns;
}
