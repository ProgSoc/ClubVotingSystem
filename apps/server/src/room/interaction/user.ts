import { VoterNotFoundError } from '../../errors';
import { pubSub } from '../../live';
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
    async getCurrentVoterState(votingKey: string) {
      const voter = await voterFns.getUserByVotingKey(votingKey);
      if (!voter) {
        throw new VoterNotFoundError(votingKey);
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

    async castVote(votingKey: string, questionId: string, vote: QuestionResponse) {
      const voter = await voterFns.getUserByVotingKey(votingKey);
      if (!voter) {
        throw new VoterNotFoundError(votingKey);
      }

      await questionFns.voteForQuestion(questionId, voter.id, vote);

      await helpers.notifyEveryoneOfBoardChange();
    },
  };

  return fns;
}

export function withRoomVoterFunctions<T>(
  roomId: string,
  withLock: (fns: ReturnType<typeof makeRoomVoterFunctions>) => Promise<T>,
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

  return new Promise<RoomUserResolvedState>(async (resolve, reject) => {
    for await (const {data} of pubSub.subscribe("userWaitingList", userId)) {
      const resolvedState = userRoomStateToResolvedState(data);
      if (resolvedState) {
        resolve(resolvedState);
      }
    }

    // In case some unexpected race condition happened, try sending the state again 5 seconds later.
    // This never happened in testing, but adding this here just in case.
    setTimeout(async () => {
      const status = await getAdmissionStatus();
      pubSub.publish("userWaitingList", userId, { data: status})
    }, 5000);
  });
}

export async function* subscribeToBoardNotifications(roomId: string) {
  yield withRoomVoterFunctions(roomId, async fns => fns.getCurrentBoardState())

   const newNotifications = pubSub.subscribe(
    "roomBoardEvents",
    roomId,
  );

  for await (const _notificationData of newNotifications) {
    yield withRoomVoterFunctions(roomId, async fns => fns.getCurrentBoardState())
  }
}

export async function* subscribeToVoterNotifications(
  roomId: string,
  votingKey: string,
) {
  yield withRoomVoterFunctions(roomId, async fns => fns.getCurrentVoterState(votingKey))

  const newNotifications = pubSub.subscribe("roomVoter",
    `${roomId}-${votingKey}`,
  );

  for await (const _notificationData of newNotifications) {
   yield withRoomVoterFunctions(roomId, async fns => fns.getCurrentVoterState(votingKey))
  }
}
