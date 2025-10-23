import { NoQuestionOpenError, QuestionAlreadyOpenError, RoomIsClosedError } from '../../errors';
import { pubSub, roomBoardEventsNotifications, roomVoterNotifications, roomWaitingListNotifications } from '../../live';
import type { ShowingQuestionState, ShowingResultsState } from '../../live/states';
import { BoardState, VoterState } from '../../live/states';
import { AyncKeyLock } from '../../lock';
import type { RoomQuestion } from './db/questions';
import { makeQuestionModificationFunctions } from './db/questions';
import { makeCurrentRoomFunctions } from './db/room';
import { makeVoterInteractionFunctions } from './db/users';

export const roomLock = new AyncKeyLock();

export function makeQuestionHelpers(roomId: string) {
  const roomFns = makeCurrentRoomFunctions(roomId);
  const questionFns = makeQuestionModificationFunctions(roomId);
  const voterFns = makeVoterInteractionFunctions(roomId);

  const fns = {
    roomFns,
    questionFns,
    voterFns,

    async notifyAdminsOfUsersChanged() {
      const usersList = await voterFns.currentRoomUsersList();
      pubSub.publish("roomWaitingList", roomId, { data: usersList})
    },

    async notifyEveryoneOfBoardChange() {
      const boardState = await fns.getCurrentBoardState();
      const voterState = boardStateToVoterState(boardState);
      const voters = await voterFns.currentRoomUsersListWithvotingKeys();

      pubSub.publish("roomBoardEvents", roomId, { data: boardState})
      voters.admitted.forEach((voter) => {
        pubSub.publish("roomVoter", `${roomId}-${voter.votingKey}`, { data: voterState})
      });
    },

    async assertRoomNotClosed() {
      const room = await roomFns.getRoom();
      if (room.closedAt) {
        throw new RoomIsClosedError(room);
      }
    },

    async isQuestionOpen() {
      const question = await questionFns.currentQuestion();
      return question && !question.closed;
    },

    async assertNoQuestionOpen() {
      const open = await fns.isQuestionOpen();
      if (open) {
        throw new QuestionAlreadyOpenError();
      }
    },

    async assertQuestionOpen() {
      const open = await fns.isQuestionOpen();
      if (!open) {
        throw new NoQuestionOpenError();
      }
    },

    async getCurrentlyOpenQuestion() {
      const question = await questionFns.currentQuestion();
      if (!question) {
        throw new NoQuestionOpenError();
      }
      return question;
    },

    async getShowingQuestionState(question: RoomQuestion): Promise<ShowingQuestionState> {
      const people = await voterFns.currentRoomUsersList();
      return {
        questionId: question.id,
        question: question.question,
        peopleVoted: question.totalVoters,
        details: question.details,
        totalPeople: people.admitted.length,
        candidates: question.candidates,
      };
    },

    async getShowingResultsState(question: RoomQuestion): Promise<ShowingResultsState> {
      const questionState = await fns.getShowingQuestionState(question);
      return {
        ...questionState,
        results: question.results,
      };
    },

    async getCurrentBoardState(): Promise<BoardState> {
      const room = await roomFns.getRoom();

      if (room.closedAt) {
        return BoardState.ended({});
      }

      const question = await questionFns.currentQuestion();
      const users = await voterFns.currentRoomUsersList();

      if (!question) {
        return BoardState.blank({ totalPeople: users.admitted.length });
      }

      if (question.closed) {
        const state = await fns.getShowingResultsState(question);
        return BoardState.showingResults(state);
      }
      else {
        const state = await fns.getShowingQuestionState(question);
        return BoardState.showingQuestion(state);
      }
    },

    async getAllResults(): Promise<RoomQuestion[]> {
      const questions = await questionFns.allQuestions();
      return questions;
    },
  };

  return fns;
}

export function boardStateToVoterState(state: BoardState) {
  return BoardState.match<VoterState>(state, {
    blank: s => VoterState.blank(s),
    showingQuestion: s => VoterState.showingQuestion(s),
    showingResults: s => VoterState.showingResults(s),
    ended: () => VoterState.ended({}),
  });
}
