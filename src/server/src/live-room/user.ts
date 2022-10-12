import type { UserLocation } from '@prisma/client';
import { WaitingState } from '@prisma/client';

import { prisma } from '../prisma';
import type { GetStatesUnion } from '../state';
import { makeStates, state } from '../state';
import { UnreachableError } from '../unreachableError';

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
export const RoomUserState = makeStates('rurs', {
  waiting: state<WithUserId>(),
  admitted: state<WithVoterId>(),
  declined: state<WithUserId>(),
  kicked: state<WithUserId>(),
});

export interface RoomUsersList {
  waiting: RoomUserWithDetails[];
  admitted: RoomUserWithDetails[];
}

export async function createWaitingRoomUser(
  roomId: string,
  params: JoinWaitingRoomParams
): Promise<RoomUserWithDetails> {
  const waitingRoomUser = await prisma.roomUser.create({
    data: {
      studentEmail: params.studentEmail,
      location: params.location,
      roomId,
      state: WaitingState.Waiting,
    },
  });

  return {
    id: waitingRoomUser.id,
    details: {
      studentEmail: waitingRoomUser.studentEmail,
      location: waitingRoomUser.location,
    },
  };
}

export async function admitWaitingRoomUser(userId: string): Promise<{ voterId: string }> {
  return prisma.$transaction(async (prisma): Promise<{ voterId: string }> => {
    const user = await prisma.roomUser.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || user.state !== WaitingState.Waiting) {
      throw new Error('User not found or not waiting');
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
}

export async function declineWaitingRoomUser(userId: string) {
  return prisma.$transaction(async (prisma) => {
    const user = await prisma.roomUser.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || user.state !== WaitingState.Waiting) {
      throw new Error('User not found or not waiting');
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
}

export async function kickVoter(voterId: string): Promise<RoomUserState | null> {
  return prisma.$transaction(async (prisma): Promise<RoomUserState | null> => {
    const user = await prisma.roomUser.findUnique({
      where: {
        voterId,
      },
    });

    if (!user || user.state !== WaitingState.Admitted) {
      throw new Error('User not found or not admitted');
    }

    const waitingRoomUser = await prisma.roomUser.update({
      where: {
        id: user.id,
      },
      data: {
        state: WaitingState.Kicked,
      },
    });

    return RoomUserState.declined({ id: waitingRoomUser.id });
  });
}

export async function getRoomUserState(id: string, roomId: string): Promise<RoomUserState | null> {
  const waitingRoomUser = await prisma.roomUser.findUnique({
    where: {
      id,
    },
  });

  if (!waitingRoomUser || waitingRoomUser.roomId !== roomId) {
    return null;
  }

  switch (waitingRoomUser.state) {
    case WaitingState.Waiting:
      return RoomUserState.waiting({
        id: waitingRoomUser.id,
      });
    case WaitingState.Admitted:
      return RoomUserState.admitted({
        id: waitingRoomUser.id,

        // When admitted, it's assumed that user is not null
        voterId: waitingRoomUser.voterId!,
      });
    case WaitingState.Declined:
      return RoomUserState.declined({
        id: waitingRoomUser.id,
      });
    case WaitingState.Kicked:
      return RoomUserState.kicked({
        id: waitingRoomUser.id,
      });

    default:
      throw new UnreachableError(waitingRoomUser.state);
  }
}

export async function getWaitingRoomUsersList(roomId: string): Promise<WaitingRoomUser[]> {
  const waitingRoomUsers = await prisma.roomUser.findMany({
    where: {
      roomId,
      state: WaitingState.Waiting,
    },
  });

  return waitingRoomUsers.map((user) => ({
    id: user.id,
    state: WaitingState.Waiting,
    details: {
      studentEmail: user.studentEmail,
      location: user.location,
    },
  }));
}
