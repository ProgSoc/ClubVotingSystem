import type { CandidateVote, Question, QuestionCandidate, QuestionInteraction } from '@prisma/client';
import { QuestionType } from '@prisma/client';

import { NoQuestionOpenError, QuestionAlreadyClosedError } from '../../../errors';
import type { VotingCandidate } from '../../../live-room/live-states';
import type { QuestionResponse } from '../../../live-room/question';
import type { ResultsView } from '../../../live-room/results';
import { prisma } from '../../../prisma';
import { UnreachableError } from '../../../unreachableError';
import type { CreateQuestionParams, QuestionFormatDetails } from '../../types';

const prismaQuestionInclude = {
  interactions: true,
  candidates: {
    include: {
      votes: true,
    },
  },
} as const;
type PrismaQuestionInclude = Question & {
  candidates: (QuestionCandidate & {
    votes: CandidateVote[];
  })[];
  interactions: QuestionInteraction[];
};

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

  originalPrismaQuestionObject: PrismaQuestionInclude;
}

export function mapPrismaQuestionInclude(question: PrismaQuestionInclude): RoomQuestion {
  // Count the number of unique voters by inserting them into a set
  const uniqueVoters = new Set<string>();
  question.candidates.forEach((candidate) => {
    candidate.votes.forEach((vote) => {
      uniqueVoters.add(vote.voterId);
    });
  });

  const votesWithoutAbstain = uniqueVoters.size;
  const votesWithAbstain = question.interactions.length;

  // The abstain count includes both people explicitly selecting abstain and people who haven't interacted with the question
  const abstainCount = Math.max(0, question.votersPresentAtEnd - votesWithoutAbstain);

  const makeDetails = (): QuestionFormatDetails => {
    switch (question.format) {
      case QuestionType.SingleVote:
        return {
          type: QuestionType.SingleVote,
        };
      default:
        throw new UnreachableError(question.format);
    }
  };

  const makeResults = (): ResultsView => {
    switch (question.format) {
      case QuestionType.SingleVote:
        return {
          type: QuestionType.SingleVote,
          results: question.candidates.map((candidate) => ({
            id: candidate.id,
            name: candidate.name,
            votes: candidate.votes.length,
          })),
          abstained: abstainCount,
        };
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

    interactedVoters: question.interactions.map((interaction) => interaction.voterId),
    totalVoters: votesWithAbstain,
    candidates: question.candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
    })),

    originalPrismaQuestionObject: question,
  };
}

export function makeQuestionModificationFunctions(roomId: string) {
  let currentQuestionPromise: Promise<PrismaQuestionInclude | null> | null = null;

  async function fetchCurrentQuestion() {
    const question = await prisma.question.findFirst({
      where: {
        roomId,
      },
      orderBy: { createdAt: 'desc' },
      include: prismaQuestionInclude,
    });
    return question;
  }

  const fns = {
    currentQuestion: () => {
      if (!currentQuestionPromise) {
        currentQuestionPromise = fetchCurrentQuestion();
      }
      return currentQuestionPromise;
    },
    createNewQuestion: async (params: CreateQuestionParams) => {
      const questionPromise = prisma.question.create({
        data: {
          question: params.question,
          format: params.details.type,
          roomId,
          candidates: {
            createMany: {
              data: params.candidates.map((candidate) => ({ name: candidate })),
            },
          },
        },
        include: prismaQuestionInclude,
      });
      currentQuestionPromise = questionPromise;
      return mapPrismaQuestionInclude(await questionPromise);
    },
    closeQuestion: async (questionId: string, votersPresent: number) => {
      const questionPromise = prisma.question.update({
        where: { id: questionId },
        data: { closed: true, votersPresentAtEnd: votersPresent },
        include: prismaQuestionInclude,
      });
      currentQuestionPromise = questionPromise;
      return mapPrismaQuestionInclude(await questionPromise);
    },

    async voteForQuestion(questionId: string, voterId: string, response: QuestionResponse) {
      return prisma.$transaction(async (prisma) => {
        const question = await fns.currentQuestion();

        if (!question) {
          throw new NoQuestionOpenError();
        }

        if (question.id !== questionId) {
          throw new QuestionAlreadyClosedError();
        }

        // Create the interaction (if doesnt exist) to add to the vote count
        await prisma.questionInteraction.upsert({
          create: {
            question: { connect: { id: questionId } },
            voter: { connect: { id: voterId } },
          },
          update: {},
          where: {
            questionId_voterId: { questionId, voterId },
          },
        });

        // Delete all previous votes from the voter for the question
        await prisma.candidateVote.deleteMany({
          where: {
            voterId,
            candidate: {
              questionId,
            },
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (response.type !== question.format && response.type !== 'Abstain') {
          throw new Error('Invalid response type');
        }

        switch (response.type) {
          case 'Abstain':
            // Do nothing, the votes have already been cleared
            break;
          case 'SingleVote':
            await prisma.candidateVote.create({
              data: {
                voterId,
                candidateId: response.candidateId,
              },
            });
            break;
          default:
            throw new UnreachableError(response);
        }

        currentQuestionPromise = null;
      });
    },

    async getQuestionVote(questionId: string, voterId: string) {
      const question = await fns.currentQuestion();

      if (!question || question.id !== questionId) {
        return null;
      }

      const votes: CandidateVote[] = [];
      question.candidates.forEach((c) => {
        const vote = c.votes.find((v) => v.voterId === voterId);
        if (vote) {
          votes.push(vote);
        }
      });

      if (votes.length === 0) {
        if (question.interactions.find((i) => i.voterId === voterId)) {
          // If there are no votes but the user interacted, then the user abstained
          return {
            type: 'Abstain',
          };
        } else {
          return null;
        }
      }

      switch (question.format) {
        case QuestionType.SingleVote:
          return {
            type: QuestionType.SingleVote,
            candidateId: votes[0].candidateId,
          };
        default:
          throw new UnreachableError(question.format);
      }
    },
  };

  return fns;
}
