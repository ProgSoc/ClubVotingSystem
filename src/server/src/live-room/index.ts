import type { Room } from '@prisma/client';
import { WaitingState } from '@prisma/client';
import { customAlphabet } from 'nanoid';

import { prisma } from '../../prisma';
import type { JoinWaitingRoomParams } from './inputs';
import { Listeners, WithListener } from './listener';
import type { ProjectorState, QuestionSetterState, VoterState } from './question-states';
import type {
  AdmittedRoomUser,
  RoomUserState,
  UserListeningToWaitingRoomState,
  WaitingRoomUser,
  WaitingRoomUserWithDetails,
} from './user';
import { admitWaitingRoomUser, createWaitingRoomUser, getRoomUser } from './user';

const makeAdminKeyId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 32);

// Although this is short, it will support having over 1 million rooms
const makePublicShortId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4);

export class LiveRoom {
  questionSetterAdminListeners: Listeners<QuestionSetterState> = new Listeners();
  waitingRoomAdminListeners: Listeners<WaitingRoomUserWithDetails[]> = new Listeners();
  projectorListeners: Listeners<ProjectorState> = new Listeners();

  waitingRoom: WithListener<WaitingRoomUserWithDetails, RoomUserState>[];
  voters: WithListener<AdmittedRoomUser, VoterState>[] = [];

  private constructor(readonly room: Room, waitingUsers: WaitingRoomUserWithDetails[], voters: AdmittedRoomUser[]) {
    this.waitingRoom = waitingUsers.map((user) => new WithListener(user));
    this.voters = voters.map((user) => new WithListener(user));

    // Call the notify function so that the initial admin state is loaded up
    void this.notifyAdminsOfUsersChange();

    // FIXME: Also notify about the initial projector/question state
  }

  //
  // #region Static functions creating room instances
  //

  static async createNewRoom(name: string): Promise<LiveRoom> {
    // Loop until we find a unique public key. If we fail after 100 attempts, then there are serious issues.
    for (let i = 0; i < 100; i++) {
      const room = await prisma.room.create({
        data: {
          name,
          adminKey: makeAdminKeyId(),
          shortId: makePublicShortId(),
        },
      });

      return new LiveRoom(room, [], []);
    }

    throw new Error('Unexpected error: Failed to create a new room');
  }

  static async getAllCurrentRooms(): Promise<LiveRoom[]> {
    const rooms = await prisma.room.findMany({
      where: {
        closedAt: null,
      },
      include: {
        users: {
          include: {
            voter: true,
          },
        },
      },
    });

    return rooms.map((room) => {
      const waitingRoomUsers = room.users
        .filter((user) => user.state === WaitingState.Waiting)
        .map<WaitingRoomUserWithDetails>((user) => ({
          id: user.id,
          location: user.location,
          studentEmail: user.studentEmail,
        }));

      const roomVoters = room.users
        .filter((user) => user.state === WaitingState.Admitted && user.voterId)
        .map<AdmittedRoomUser>((user) => ({
          id: user.id,
          state: WaitingState.Admitted,
          voterId: user.voterId!,
        }));

      return new LiveRoom(
        {
          id: room.id,
          adminKey: room.adminKey,
          name: room.name,
          shortId: room.shortId,
          closedAt: room.closedAt,
          createdAt: room.createdAt,
        },
        waitingRoomUsers,
        roomVoters
      );
    });
  }

  // #endregion

  //
  // #region Functions for making changes to the room
  //

  /** Join a user to the waiting room, notify admins that the list has updated, return the waiting user */
  async joinWaitingRoom(params: JoinWaitingRoomParams): Promise<WaitingRoomUser> {
    const user = await createWaitingRoomUser(this.room.id, params);

    await this.addUserToList(user);

    return {
      id: user.id,
      state: WaitingState.Waiting,
    };
  }

  /** Admit a user as a voter, notify the admins that the list has updated, return the admitted user (with voter id) */
  async admitWaitingRoomUser(userId: string): Promise<AdmittedRoomUser | null> {
    const user = await prisma.roomUser.findUnique({ where: { id: userId } });
    if (!user || user.roomId !== this.room.id || user.state !== WaitingState.Waiting) {
      return null;
    }

    const admitted = await admitWaitingRoomUser(userId);
    if (!admitted) {
      return null;
    }

    // Add the user to voters, remove from waiting room
    await this.removeUserFromList(userId);
    await this.addVoterToList(admitted);

    return admitted;
  }

  // #endregion

  //
  // #region Functions to listen on the room
  //

  async tryListenWaitingRoomUser(
    userId: string,
    listener: (user: RoomUserState) => Promise<void>
  ): Promise<UserListeningToWaitingRoomState | null> {
    const user = await getRoomUser(userId, this.room.id);
    if (!user) {
      return null;
    }

    // If admitted or declined, return the user directly, as the types are the same
    if (user.state === WaitingState.Admitted || user.state === WaitingState.Declined) {
      return user;
    }

    // If waiting, add a listener to the user and return the user with an unsubscribe function
    const userListener = this.getUserListener(userId);
    if (!userListener) {
      // TODO: This shouldn't be a valid state, for now I don't want to properly handle it.
      return null;
    }

    const unsubscribe = await userListener.listen(listener);

    return {
      id: user.id,
      state: user.state,
      unsubscribe,
    };
  }

  async tryListenVoter(voterId: string, listener: (user: VoterState) => Promise<void>) {
    const voterListener = this.getVoterListener(voterId);
    if (!voterListener) {
      return null;
    }

    const unsubscribe = await voterListener.listen(listener);
    return unsubscribe;
  }

  async listenWaitingRoomAdmin(listener: (users: WaitingRoomUserWithDetails[]) => Promise<void>) {
    const unsubscribe = await this.waitingRoomAdminListeners.listen(listener);
    return unsubscribe;
  }

  async listenQuestionSetterAdmin(listener: (state: QuestionSetterState) => Promise<void>) {
    const unsubscribe = await this.questionSetterAdminListeners.listen(listener);
    return unsubscribe;
  }

  async listenProjector(listener: (state: ProjectorState) => Promise<void>) {
    const unsubscribe = await this.projectorListeners.listen(listener);
    return unsubscribe;
  }

  // #endregion

  //
  // #region Internal helper functions
  //

  private getUserListener(userId: string): WithListener<WaitingRoomUserWithDetails, RoomUserState> | null {
    return this.waitingRoom.find((wr) => wr.val.id === userId) || null;
  }

  private getVoterListener(voterId: string): WithListener<AdmittedRoomUser, VoterState> | null {
    return this.voters.find((v) => v.val.id === voterId) || null;
  }

  private async removeUserFromList(userId: string) {
    this.waitingRoom = this.waitingRoom.filter((wr) => wr.val.id !== userId);
    await this.notifyAdminsOfUsersChange();
  }

  private async addUserToList(user: WaitingRoomUserWithDetails) {
    const listener = new WithListener<WaitingRoomUserWithDetails, RoomUserState>(user);
    this.waitingRoom.push(listener);
    await this.notifyAdminsOfUsersChange();
    return listener;
  }

  private async notifyAdminsOfUsersChange() {
    await this.waitingRoomAdminListeners.notify(this.waitingRoom.map((wr) => wr.val));
  }

  private async addVoterToList(voter: AdmittedRoomUser) {
    const listener = new WithListener<AdmittedRoomUser, VoterState>(voter);
    this.voters.push(listener);
    return listener;
  }

  // #endregion
}
