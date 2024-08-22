import { NoQuestionOpenError, QuestionAlreadyClosedError } from '../../../errors';
import type { QuestionResponse, ResultsView } from '../../../live/question';
import type { VotingCandidate } from '../../../live/states';
import { UnreachableError } from '../../../unreachableError';
import type { CreateQuestionParams, QuestionFormatDetails } from '../../types';
import { rankedChoiceVoting } from '../preferentialVote';
import type {
  CloseQuestionDetails,
  DbQuestionData,
} from './queries';
import {
  dbCloseQuestion,
  dbCreatePreferentialVoteQuestion,
  dbCreateSingleVoteQuestion,
  dbFetchAllQuestionsData,
  dbFetchCurrentQuestionData,
  dbInsertQuestionPreferentialVote,
  dbInsertQuestionSingleVote,
  dbQuestionAbstain,
} from './queries';

export interface RoomQuestion {
  id: string;
  question: string;
  details: QuestionFormatDetails;
  createdAt: Date;
  closed: boolean;
  totalVoters: number;
  candidates: VotingCandidate[];
  interactedVoters: string[];
  results: ResultsView;

  originalDbQuestionDataObject: DbQuestionData;
}

function mapDbQuestionData(question: DbQuestionData): RoomQuestion {
  // Count the number of unique voters by inserting them into a set
  const uniqueVoters = new Set<string>();
  question.candidates.forEach((candidate) => {
    candidate.singleCandidateVotes.forEach((vote) => {
      uniqueVoters.add(vote.voter.id);
    });
    candidate.preferentialCandidateVotes.forEach((vote) => {
      candidate.preferentialCandidateVotes.forEach((vote) => {
        uniqueVoters.add(vote.voter.id);
      });
    });
  });

  const votesWithoutAbstain = uniqueVoters.size;
  const votesWithAbstain = question.interactedUsers.length;

  // The abstain count includes both people explicitly selecting abstain and people who haven't interacted with the question
  const abstainCount = Math.max(0, question.votersPresentAtEnd - votesWithoutAbstain);

  const makeDetails = (): QuestionFormatDetails => {
    switch (question.format) {
      case 'SingleVote':
        return {
          type: 'SingleVote',
        };
      case 'PreferentialVote':
        return {
          type: 'PreferentialVote',
          maxElected: question.maxElected,
        };
      default:
        throw new UnreachableError(question.format);
    }
  };

  const makeResults = (): ResultsView => {
    switch (question.format) {
      case 'SingleVote':
        return {
          type: 'SingleVote',
          results: question.candidates.map(candidate => ({
            id: candidate.id,
            name: candidate.name,
            votes: candidate.singleCandidateVotes.length,
          })),
          abstained: abstainCount,
        };
      case 'PreferentialVote': {
        const candidateWithVotes = question.candidates.flatMap(candidate => candidate.preferentialCandidateVotes.map(vote => ({
          voterId: vote.voter.id,
          candidateId: candidate.id,
          rank: vote.rank,
        })));

        const voterAndCandidateRank: Record<string, { candidateId: string; rank: number }[]> = {};

        for (const vote of candidateWithVotes) {
          if (!voterAndCandidateRank[vote.voterId]) {
            voterAndCandidateRank[vote.voterId] = [];
          }
          voterAndCandidateRank[vote.voterId].push({
            candidateId: vote.candidateId,
            rank: vote.rank,
          });
        }

        const votingPreferences = Object.entries(voterAndCandidateRank).map(([_voterId, votes]) => {
          const sortedVotes = votes.sort((a, b) => a.rank - b.rank); // sort by preference
          return sortedVotes.map(vote => vote.candidateId);
        });

        const candidateIds = question.candidates.map(candidate => candidate.id);

        const resultIds = rankedChoiceVoting(candidateIds, votingPreferences, question.maxElected); // get the result in order of preference

        const results = resultIds.map((c, index) => ({
          id: c.id,
          name: question.candidates.find(candidate => candidate.id === c.id)!.name,
          rank: index + 1,
          votes: candidateWithVotes.filter(vote => vote.candidateId === c.id).length,
        }));

        return {
          type: 'PreferentialVote',
          results,
          abstained: abstainCount,
        };
      }
      default:
        throw new UnreachableError(question.format);
    }
  };

  return {
    id: question.id,
    createdAt: question.createdAt,
    question: question.question,
    closed: question.closed,

    details: makeDetails(),
    results: makeResults(),

    interactedVoters: question.interactedUsers.map(interaction => interaction.id),
    totalVoters: votesWithAbstain,
    candidates: question.candidates.map(candidate => ({
      id: candidate.id,
      name: candidate.name,
    })),

    originalDbQuestionDataObject: question,
  };
}

export function makeQuestionModificationFunctions(roomId: string) {
  let currentQuestionPromise: Promise<RoomQuestion | null> | null = null;

  async function fetchCurrentQuestion() {
    const question = await dbFetchCurrentQuestionData(roomId);

    if (!question) {
      return null;
    }

    return mapDbQuestionData(question);
  }

  const fns = {
    currentQuestion: () => {
      if (!currentQuestionPromise) {
        currentQuestionPromise = fetchCurrentQuestion();
      }
      return currentQuestionPromise;
    },
    allQuestions: async () => {
      const questions = await dbFetchAllQuestionsData(roomId);
      const mapped = questions.map(q => mapDbQuestionData(q));
      return mapped;
    },
    createNewQuestion: async (params: CreateQuestionParams) => {
      let questionPromise: Promise<DbQuestionData>;
      switch (params.details.type) {
        case 'SingleVote': {
          questionPromise = dbCreateSingleVoteQuestion({
            candidates: params.candidates,
            question: params.question,
          });
          break;
        }
        case 'PreferentialVote':
          questionPromise = dbCreatePreferentialVoteQuestion({
            candidates: params.candidates,
            question: params.question,
          });
          break;
        // default:
          // Uncomment when there's multiple question types
          // throw new UnreachableError(params.details.type);
      }

      currentQuestionPromise = questionPromise.then(mapDbQuestionData);
      return mapDbQuestionData(await questionPromise);
    },
    closeQuestion: async (questionId: string, details: CloseQuestionDetails) => {
      const questionPromise = dbCloseQuestion(questionId, details);
      currentQuestionPromise = questionPromise.then(mapDbQuestionData);
      return mapDbQuestionData(await questionPromise);
    },

    async voteForQuestion(questionId: string, userId: string, response: QuestionResponse) {
      const question = await fns.currentQuestion();

      if (!question) {
        throw new NoQuestionOpenError();
      }

      if (question.id !== questionId) {
        throw new QuestionAlreadyClosedError();
      }
      switch (response.type) {
        case 'Abstain':
          await dbQuestionAbstain(questionId, userId);
          break;
        case 'SingleVote':
          await dbInsertQuestionSingleVote(questionId, userId, response.candidateId);
          break;
        case 'PreferentialVote':
          await dbInsertQuestionPreferentialVote(questionId, userId, response.candidateIds);
          break;
        default:
          throw new UnreachableError(response);
      }

      currentQuestionPromise = null;
    },

    async getQuestionVote(questionId: string, votingKey: string): Promise<QuestionResponse | null> {
      const question = await fns.currentQuestion();

      if (!question || question.id !== questionId) {
        return null;
      }

      // User hasn't interacted with the question
      if (!question.interactedVoters.includes(votingKey)) {
        return null;
      }

      switch (question.details.type) {
        case 'SingleVote': {
          const allSingleCandidateVotes = question.originalDbQuestionDataObject.candidates.flatMap(
            candidate => candidate.singleCandidateVotes,
          );

          const votes = allSingleCandidateVotes.filter(vote => vote.voter.id === votingKey);
          const vote = votes.at(0);

          if (vote) {
            return {
              type: 'SingleVote',
              candidateId: vote.candidate.id,
            };
          }
          else {
            return {
              type: 'Abstain',
            };
          }
        }
        case 'PreferentialVote': {
          const allPreferentialCandidateVotes = question.originalDbQuestionDataObject.candidates.flatMap(
            candidate => candidate.preferentialCandidateVotes,
          );

          const votes = allPreferentialCandidateVotes.filter(vote => vote.voter.id === votingKey);

          if (votes.length === 0) {
            return {
              type: 'Abstain',
            };
          }

          return {
            type: 'PreferentialVote',
            candidateIds: votes.map(vote => vote.voter.id),
          };
        }
        // default:
        //   throw new UnreachableError(question.details.type);
      }
    },
  };

  return fns;
}
