import { VoterNotFoundError } from '../../errors';
import { roomBoardEventsNotifications, roomVoterNotifications, userWaitingListNotifications } from '../../live';
import type { QuestionResponse } from '../../live/question';
import type { BoardState } from '../../live/states';
import { VoterState } from '../../live/states';
import type { RoomPublicInfo } from '../types';
import type { JoinWaitingRoomParams, RoomUserResolvedState } from './db/users';
import { userRoomStateToResolvedState } from './db/users';
import { boardStateToVoterState, makeQuestionHelpers, roomLock } from './helpers';

function makeRoomVoterFunctions(roomId: string) {
  const { questionFns, voterFns, roomFns, ...helpers } = makeQuestionHelpers(roomId);

  const fns = {
    async getRoomPublicInfo(): Promise<RoomPublicInfo> {
      const room = await roomFns.getRoom();

      return {
        id: room.id,
        shortId: room.shortId,
        name: room.name,
        createdAt: room.createdAt.toISOString(),
        closedAt: room.closedAt?.toISOString() ?? null,
      };
    },

    async joinWaitingList(params: JoinWaitingRoomParams) {
      const user = await voterFns.joinWaitingList(params);
      await helpers.notifyAdminsOfUsersChanged();
      return user;
    },

    async getUserAdmissionStatus(userId: string) {
      return voterFns.getUserAdmissionStatus(userId);
    },

    getCurrentBoardState: helpers.getCurrentBoardState,
    async getCurrentVoterState(voterId: string) {
      const voter = await voterFns.getUserByVoterId(voterId);
      if (!voter) {
        throw new VoterNotFoundError(voterId);
      }

      if (voter.state === 'Kicked') {
        return VoterState.kicked({});
      }

      const boardState = await helpers.getCurrentBoardState();
      return boardStateToVoterState(boardState);
    },

    getQuestionVote: questionFns.getQuestionVote,
    async getAllQuestionResults() {
      const questions = await questionFns.allQuestions();
      return questions.map((question) => {
        return {
          questionId: question.id,
          question: question.question,
          results: question.results,
          closed: question.closed,
        };
      });
    },

    async castVote(voterId: string, questionId: string, vote: QuestionResponse) {
      const voter = await voterFns.getUserByVoterId(voterId);
      if (!voter) {
        throw new VoterNotFoundError(voterId);
      }

      await questionFns.voteForQuestion(questionId, voterId, vote);

      await helpers.notifyEveryoneOfBoardChange();
    },
  };

  return fns;
}

export function withRoomVoterFunctions<T>(
  roomId: string,
  withLock: (fns: ReturnType<typeof makeRoomVoterFunctions>) => Promise<T>
): Promise<T> {
  return roomLock.lock(roomId, async () => {
    const fns = makeRoomVoterFunctions(roomId);
    return withLock(fns);
  });
}

export function waitForAdmission(roomId: string, userId: string) {
  const getAdmissionStatus = async () => {
    return withRoomVoterFunctions(roomId, async (fns) => {
      return fns.getUserAdmissionStatus(userId);
    });
  };

  return new Promise<RoomUserResolvedState>((resolve, reject) => {
    const unsubscribe = userWaitingListNotifications.subscribe({ userId }, getAdmissionStatus, (state) => {
      const resolvedState = userRoomStateToResolvedState(state);
      if (!resolvedState) {
        return;
      }

      resolve(resolvedState);
      unsubscribe();
    });

    // In case some unexpected race condition happened, try sending the state again 5 seconds later.
    // This never happened in testing, but adding this here just in case.
    setTimeout(async () => {
      const status = await getAdmissionStatus();
      userWaitingListNotifications.notify({ userId }, status);
    }, 5000);
  });
}

export function subscribeToBoardNotifications(roomId: string, callback: (users: BoardState) => void) {
  return roomBoardEventsNotifications.subscribe(
    { roomId },
    () => withRoomVoterFunctions(roomId, async (fns) => fns.getCurrentBoardState()),
    callback
  );
}

export function subscribeToVoterNotifications(roomId: string, voterId: string, callback: (users: VoterState) => void) {
  return roomVoterNotifications.subscribe(
    { roomId, voterId },
    () => withRoomVoterFunctions(roomId, async (fns) => fns.getCurrentVoterState(voterId)),
    callback
  );
}
