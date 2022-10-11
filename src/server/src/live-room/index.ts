import type { CandidateVote, Room } from '@prisma/client';
import { QuestionType } from '@prisma/client';
import { WaitingState } from '@prisma/client';
import { customAlphabet } from 'nanoid';

import { prisma } from '../prisma';
import { UnreachableError } from '../unreachableError';
import type { ListenerNotifyFn } from './listener';
import { Listeners, WithListeners, WithWaiters } from './listener';
import type { BoardState, ShowingQuestionState, VoterState } from './live-states';
import { QuestionSetterState } from './live-states';
import type { CreateQuestionParams, QuestionResponse, RoomQuestion } from './question';
import {
  closeQuestion,
  createNewQuestion,
  mapPrismaQuestionInclude,
  prismaQuestionInclude,
  voteForQuestion,
} from './question';
import type {
  AdmittedRoomUser,
  AdmittedRoomUserWithDetails,
  DeclinedRoomUser,
  JoinWaitingRoomParams,
  RoomUserAdmitDecline,
  RoomUsersList,
  WaitingRoomUser,
  WaitingRoomUserWithDetails,
} from './user';
import { declineWaitingRoomUser } from './user';
import { admitWaitingRoomUser, createWaitingRoomUser, getRoomUser } from './user';

const makeAdminKeyId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 48);

// Although this is short, it will support having over 1 million rooms
const makePublicShortId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4);

export class LiveRoom {
  questionSetterAdminListeners: Listeners<QuestionSetterState> = new Listeners();
  waitingRoomAdminListeners: Listeners<RoomUsersList> = new Listeners();
  boardListeners: Listeners<BoardState> = new Listeners();

  waitingRoom: WithWaiters<WaitingRoomUserWithDetails, RoomUserAdmitDecline>[];

  // Voters listeners are stored in an array rather than a single listener so that individual
  // voters can get kicked in the future.
  voters: WithListeners<AdmittedRoomUserWithDetails, VoterState>[] = [];

  questions: RoomQuestion[];

  roomQuestionLock?: Promise<any>;

  private constructor(
    readonly room: Room,
    waitingUsers: WaitingRoomUserWithDetails[],
    voters: AdmittedRoomUserWithDetails[],
    questions: RoomQuestion[]
  ) {
    this.waitingRoom = waitingUsers.map((user) => new WithWaiters(user));
    this.voters = voters.map((user) => new WithListeners(user));
    this.questions = questions;

    // Call the notify function so that the initial admin state is loaded up
    void this.notifyAdminsOfUsersChange();
    void this.notifyEveryoneOfStateChange();
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

      return new LiveRoom(room, [], [], []);
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
        questions: {
          orderBy: { createdAt: 'asc' },
          include: prismaQuestionInclude,
        },
      },
    });

    return rooms.map((room) => {
      const waitingRoomUsers = room.users
        .filter((user) => user.state === WaitingState.Waiting)
        .map<WaitingRoomUserWithDetails>((user) => ({
          id: user.id,
          state: WaitingState.Waiting,
          details: {
            location: user.location,
            studentEmail: user.studentEmail,
          },
        }));

      const roomVoters = room.users
        .filter((user) => user.state === WaitingState.Admitted && user.voterId)
        .map<AdmittedRoomUserWithDetails>((user) => ({
          id: user.id,
          state: WaitingState.Admitted,
          details: {
            location: user.location,
            studentEmail: user.studentEmail,
          },
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
        roomVoters,
        room.questions.map((question) => mapPrismaQuestionInclude(question))
      );
    });
  }

  // #endregion

  //
  // #region Functions for making changes to the room
  //

  /** Join a user to the waiting room, notify admins that the list has updated, return the waiting user */
  async joinWaitingRoom(params: JoinWaitingRoomParams): Promise<WaitingRoomUser> {
    this.assertRoomNotClosed();
    const user = await createWaitingRoomUser(this.id, params);

    await this.addUserToList(user);

    return {
      id: user.id,
      state: WaitingState.Waiting,
    };
  }

  /** Admit a user as a voter, notify the admins that the list has updated, return the admitted user (with voter id) */
  async admitWaitingRoomUser(userId: string): Promise<AdmittedRoomUser | null> {
    this.assertRoomNotClosed();
    const user = await prisma.roomUser.findUnique({ where: { id: userId } });
    if (!user || user.roomId !== this.id || user.state !== WaitingState.Waiting) {
      return null;
    }

    const admitted = await admitWaitingRoomUser(userId);
    if (!admitted) {
      return null;
    }

    const listener = this.getUserWaiter(userId);
    if (listener) {
      await listener.notify(admitted);
    }

    // Add the user to voters, remove from waiting room
    await this.removeUserFromList(userId);
    await this.addVoterToList(admitted);

    return admitted;
  }

  /** Decline a user, notify the admins that the list has updated */
  async declineWaitingRoomUser(userId: string): Promise<DeclinedRoomUser | null> {
    this.assertRoomNotClosed();
    const user = await prisma.roomUser.findUnique({ where: { id: userId } });
    if (!user || user.roomId !== this.id || user.state !== WaitingState.Waiting) {
      return null;
    }

    const declined = await declineWaitingRoomUser(userId);
    if (!declined) {
      return null;
    }

    const listener = this.getUserWaiter(userId);
    if (listener) {
      await listener.notify(declined);
    }

    // Add the user to voters, remove from waiting room
    await this.removeUserFromList(userId);

    return declined;
  }

  /** Cast a vote on a question, notify everyone of the current question state change */
  async castVote(questionId: string, voterId: string, response: QuestionResponse): Promise<boolean> {
    return this.withQuestionLock(async () => {
      this.assertRoomNotClosed();
      const voter = this.getVoterListener(voterId);
      if (!voter) {
        throw new Error("Can't find voter");
      }

      const question = this.currentQuestion;
      if (!question || question.closed) {
        throw new Error('No question is currently open');
      }

      const updatedQuestion = await voteForQuestion(questionId, voterId, response);
      if (!updatedQuestion) {
        throw new Error('Failed to update question');
      }

      this.updateCurrentQuestion(updatedQuestion);
      await this.notifyEveryoneOfStateChange();

      return true;
    });
  }

  async closeCurrentQuestion(questionId: string): Promise<void> {
    return this.withQuestionLock(async () => {
      this.assertRoomNotClosed();
      const question = this.currentQuestion;
      if (!question || question.closed || question.id !== questionId) {
        throw new Error("Failed to close question: Question doesn't exist or is already closed");
      }

      const updatedQuestion = await closeQuestion(questionId, this.voters.length);

      this.updateCurrentQuestion(updatedQuestion);
      await this.notifyEveryoneOfStateChange();
    });
  }

  async startNewQuestion(params: CreateQuestionParams): Promise<void> {
    return this.withQuestionLock(async () => {
      this.assertRoomNotClosed();
      const question = this.currentQuestion;
      if (question && !question.closed) {
        throw new Error('Failed to start new question: Another question is currently open');
      }

      const newQuestion = await createNewQuestion(this.id, params);

      this.questions.push(newQuestion);
      await this.notifyEveryoneOfStateChange();
    });
  }

  async closeRoom(): Promise<void> {
    return this.withQuestionLock(async () => {
      this.assertRoomNotClosed();

      if (this.currentQuestion && !this.currentQuestion.closed) {
        throw new Error('Failed to close room: A question is currently open');
      }

      const closedAt = new Date();
      await prisma.room.update({
        where: { id: this.id },
        data: { closedAt },
      });

      this.room.closedAt = closedAt;
      await this.notifyEveryoneOfStateChange();
    });
  }

  // #endregion

  //
  // #region Functions to listen on the room
  //

  async waitForWaitingRoomUserAdmitOrDecline(userId: string): Promise<RoomUserAdmitDecline | null> {
    const user = await getRoomUser(userId, this.id);
    if (!user) {
      return null;
    }

    // If admitted or declined, return the user directly, as the types are the same
    if (user.state === WaitingState.Admitted || user.state === WaitingState.Declined) {
      return user;
    }

    // If waiting, add a listener to the user and return the user with an unsubscribe function
    const userListener = this.getUserWaiter(userId);
    if (!userListener) {
      // TODO: This shouldn't be a valid state, for now I don't want to properly handle it.
      return null;
    }

    return new Promise((res) =>
      userListener.wait((value) => {
        res(value);
      })
    );
  }

  async tryListenVoter(voterId: string, listener: (user: VoterState) => Promise<void>) {
    const voterListener = this.getVoterListener(voterId);
    if (!voterListener) {
      return null;
    }

    const unsubscribe = await voterListener.listen(listener);
    return unsubscribe;
  }

  async listenWaitingRoomAdmin(listener: ListenerNotifyFn<RoomUsersList>) {
    const unsubscribe = await this.waitingRoomAdminListeners.listen(listener);
    return unsubscribe;
  }

  async listenQuestionSetterAdmin(listener: ListenerNotifyFn<QuestionSetterState>) {
    const unsubscribe = await this.questionSetterAdminListeners.listen(listener);
    return unsubscribe;
  }

  async listenBoard(listener: ListenerNotifyFn<BoardState>) {
    const unsubscribe = await this.boardListeners.listen(listener);
    return unsubscribe;
  }

  async getVoterVote(voterId: string, questionId: string): Promise<QuestionResponse | null> {
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) {
      return null;
    }

    const questionObj = question.originalPrismaQuestionObject;

    const votes: CandidateVote[] = [];
    questionObj.candidates.forEach((c) => {
      const vote = c.votes.find((v) => v.voterId === voterId);
      if (vote) {
        votes.push(vote);
      }
    });
    if (votes.length === 0) {
      // TODO: Support abstain votes.
      return null;
    }

    switch (questionObj.format) {
      case QuestionType.SingleVote:
        return {
          type: QuestionType.SingleVote,
          candidateId: votes[0].candidateId,
        };
      default:
        throw new UnreachableError(questionObj.format);
    }
  }

  // #endregion

  //
  // #region Internal helper functions
  //

  private getUserWaiter(userId: string): WithWaiters<WaitingRoomUserWithDetails, RoomUserAdmitDecline> | null {
    return this.waitingRoom.find((wr) => wr.val.id === userId) || null;
  }

  private getVoterListener(voterId: string): WithListeners<AdmittedRoomUser, VoterState> | null {
    return this.voters.find((v) => v.val.voterId === voterId) || null;
  }

  private async removeUserFromList(userId: string) {
    this.waitingRoom = this.waitingRoom.filter((wr) => wr.val.id !== userId);
    await this.notifyAdminsOfUsersChange();
  }

  private async addUserToList(user: WaitingRoomUserWithDetails) {
    const waiter = new WithWaiters<WaitingRoomUserWithDetails, RoomUserAdmitDecline>(user);
    this.waitingRoom.push(waiter);
    await this.notifyAdminsOfUsersChange();
    return waiter;
  }

  private async addVoterToList(voter: AdmittedRoomUserWithDetails) {
    const listener = new WithListeners<AdmittedRoomUserWithDetails, VoterState>(voter);
    this.voters.push(listener);
    await this.notifyAdminsOfUsersChange();
    await this.notifyEveryoneOfStateChange();
    return listener;
  }

  private async notifyAdminsOfUsersChange() {
    await this.waitingRoomAdminListeners.notify({
      waiting: this.waitingRoom.map((wr) => wr.val),
      admitted: this.voters.map((v) => v.val),
    });
  }

  private async notifyEveryoneOfStateChange() {
    const question = this.currentQuestion;

    const notifyEveryone = async (state: BoardState) => {
      await Promise.all([this.boardListeners.notify(state), Promise.all(this.voters.map((v) => v.notify(state)))]);
    };

    if (this.closedAt) {
      await notifyEveryone(QuestionSetterState.ended({}));
      return;
    }

    if (!question) {
      await notifyEveryone(
        QuestionSetterState.blank({
          totalPeople: this.voters.length,
        })
      );
      return;
    }

    const liveData: ShowingQuestionState = {
      questionId: question.id,
      question: question.question,
      peopleVoted: question.totalVoters,
      details: question.details,
      totalPeople: this.voters.length,
      candidates: question.candidates,
    };

    if (!question.closed) {
      // Don't send candidate vote counts while the question is still open
      await notifyEveryone(
        QuestionSetterState.showingQuestion({
          ...liveData,
        })
      );
    } else {
      await notifyEveryone(
        QuestionSetterState.showingResults({
          ...liveData,
          results: question.results,
        })
      );
    }
  }

  private updateCurrentQuestion(question: RoomQuestion) {
    if (this.questions.length === 0) {
      throw new Error('Cannot update current question when there are no questions');
    }
    this.questions[this.questions.length - 1] = question;
  }

  private assertRoomNotClosed() {
    if (this.closedAt) {
      throw new Error('Room is closed');
    }
  }

  private async withQuestionLock<T>(fn: () => Promise<T>): Promise<T> {
    if (this.roomQuestionLock) {
      const newPromise = this.roomQuestionLock.then(fn);
      this.roomQuestionLock = newPromise;
      return newPromise;
    } else {
      this.roomQuestionLock = fn();
      return this.roomQuestionLock;
    }
  }

  // #endregion

  //
  // #region Room value getters
  //

  get id() {
    return this.room.id;
  }

  get adminKey() {
    return this.room.adminKey;
  }

  get name() {
    return this.room.name;
  }

  get shortId() {
    return this.room.shortId;
  }

  get closedAt() {
    return this.room.closedAt;
  }

  get createdAt() {
    return this.room.createdAt;
  }

  get currentQuestion() {
    if (this.questions.length === 0) {
      return null;
    }
    return this.questions[this.questions.length - 1];
  }

  // #endregion
}
