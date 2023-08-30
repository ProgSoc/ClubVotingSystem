import type { RoomUser, UserLocation } from '@prisma/client';
import { WaitingState } from '@prisma/client';

import { UserNotAVoter, UserNotFoundError, UserNotInWaitingRoom } from '../../../errors';
import { prisma } from '../../../prisma';
import type { GetStatesUnion } from '../../../state';
import { makeStates, state } from '../../../state';
import { UnreachableError } from '../../../unreachableError';

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
    const roomUsers = await prisma.roomUser.findMany({
      where: { roomId },
    });
    return {
      admitted: roomUsers
        .filter((u) => u.state === 'Admitted')
        .map((u) => ({
          id: u.id,
          details: {
            studentEmail: u.studentEmail,
            location: u.location,
          },
          voterId: u.voterId!,
        })),
      waiting: roomUsers
        .filter((u) => u.state === 'Waiting')
        .map((u) => ({
          id: u.id,
          details: {
            studentEmail: u.studentEmail,
            location: u.location,
          },
        })),
    };
  }

  async function getUser(userId: string): Promise<RoomUser> {
    const user = await prisma.roomUser.findUnique({
      where: { id: userId },
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
      const waitingUser = await prisma.roomUser.create({
        data: {
          studentEmail: params.studentEmail,
          location: params.location,
          roomId,
          state: WaitingState.Waiting,
        },
      });

      currentRoomUsersListPromise = null;

      return { userId: waitingUser.id };
    },

    getUserAdmissionStatus: async (userId: string): Promise<RoomUserState> => {
      const user = await prisma.roomUser.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      return getRoomStateFromUser(user);
    },

    admitUser: async (userId: string) => {
      return prisma.$transaction(async (prisma): Promise<{ voterId: string }> => {
        const user = await getUser(userId);

        if (user.state !== WaitingState.Waiting) {
          throw new UserNotInWaitingRoom(userId);
        }

        const waitingRoomUser = await prisma.roomUser.update({
          where: {
            id: userId,
          },
          data: {
            state: WaitingState.Admitted,
            voter: {
              create: {},
            },
          },
        });

        return {
          // We assume that the voter was created
          voterId: waitingRoomUser.voterId!,
        };
      });
    },

    declineUser: async (userId: string) => {
      return prisma.$transaction(async (prisma) => {
        const user = await getUser(userId);

        if (user.state !== WaitingState.Waiting) {
          throw new UserNotInWaitingRoom(userId);
        }

        await prisma.roomUser.update({
          where: {
            id: userId,
          },
          data: {
            state: WaitingState.Declined,
          },
        });
      });
    },

    kickVoter: async (userId: string) => {
      return prisma.$transaction(async (prisma) => {
        const user = await getUser(userId);

        if (user.state !== WaitingState.Admitted) {
          throw new UserNotAVoter(userId);
        }

        await prisma.roomUser.update({
          where: {
            id: userId,
          },
          data: {
            state: WaitingState.Kicked,
          },
        });
      });
    },

    getVoterByUserId: async (userId: string) => {
      return prisma.voter.findFirst({
        where: { user: { id: userId, roomId } },
      });
    },

    getUserByVoterId: async (voterId: string) => {
      return prisma.roomUser.findFirst({
        where: { voterId, roomId },
      });
    },
  };

  return fns;
}
