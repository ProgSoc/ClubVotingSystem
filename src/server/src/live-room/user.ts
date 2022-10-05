import type { UserLocation } from '@prisma/client';
import { WaitingState } from '@prisma/client';

import { prisma } from '../../prisma';
import type { JoinWaitingRoomParams } from './inputs';

export interface WaitingRoomUser {
  id: string;
  state: typeof WaitingState['Waiting'];
}

interface UserPrivateDetails {
  studentEmail: string;
  location: UserLocation;
}

export interface WaitingRoomUserWithDetails extends WaitingRoomUser {
  details: UserPrivateDetails;
}

export interface AdmittedRoomUser {
  id: string;
  state: typeof WaitingState['Admitted'];
  voterId: string;
}

export interface AdmittedRoomUserWithDetails extends AdmittedRoomUser {
  details: UserPrivateDetails;
}

export interface DeclinedRoomUser {
  id: string;
  state: typeof WaitingState['Declined'];
}

export type RoomUserAdmitDecline = AdmittedRoomUser | DeclinedRoomUser;
export type RoomUserState = WaitingRoomUser | AdmittedRoomUser | DeclinedRoomUser;

export interface RoomUsersList {
  waiting: WaitingRoomUserWithDetails[];
  admitted: AdmittedRoomUserWithDetails[];
}

export async function createWaitingRoomUser(
  roomId: string,
  params: JoinWaitingRoomParams
): Promise<WaitingRoomUserWithDetails> {
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
    state: WaitingState.Waiting,
    details: {
      studentEmail: waitingRoomUser.studentEmail,
      location: waitingRoomUser.location,
    },
  };
}

export async function admitWaitingRoomUser(userId: string): Promise<AdmittedRoomUserWithDetails | null> {
  return prisma.$transaction(async (prisma): Promise<AdmittedRoomUserWithDetails | null> => {
    const user = await prisma.roomUser.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || user.state !== WaitingState.Waiting) {
      return null;
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
      id: waitingRoomUser.id,
      state: WaitingState.Admitted,
      voterId: waitingRoomUser.voterId!,
      details: {
        studentEmail: waitingRoomUser.studentEmail,
        location: waitingRoomUser.location,
      },
    };
  });
}

export async function declineWaitingRoomUser(userId: string): Promise<DeclinedRoomUser | null> {
  return prisma.$transaction(async (prisma): Promise<DeclinedRoomUser | null> => {
    const user = await prisma.roomUser.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || user.state !== WaitingState.Waiting) {
      return null;
    }

    const waitingRoomUser = await prisma.roomUser.update({
      where: {
        id: userId,
      },
      data: {
        state: WaitingState.Declined,
      },
    });

    return {
      id: waitingRoomUser.id,
      state: WaitingState.Declined,
    };
  });
}

export async function getRoomUser(id: string, roomId: string): Promise<RoomUserState | null> {
  const waitingRoomUser = await prisma.roomUser.findUnique({
    where: {
      id,
    },
  });

  if (!waitingRoomUser || waitingRoomUser.roomId !== roomId) {
    return null;
  }

  if (waitingRoomUser.state === WaitingState.Waiting) {
    return {
      id: waitingRoomUser.id,
      state: WaitingState.Waiting,
    };
  } else if (waitingRoomUser.state === WaitingState.Admitted) {
    return {
      id: waitingRoomUser.id,
      state: WaitingState.Admitted,

      // When admitted, it's assumed that user is not null
      voterId: waitingRoomUser.voterId!,
    };
  } else {
    return {
      id: waitingRoomUser.id,
      state: WaitingState.Declined,
    };
  }
}

export async function getWaitingRoomUsersList(roomId: string): Promise<WaitingRoomUserWithDetails[]> {
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
