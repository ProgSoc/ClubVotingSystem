import type { CandidateVote, Question, QuestionCandidate, QuestionInteraction } from '@prisma/client';
import { QuestionType } from '@prisma/client';
import type { TypeOf } from 'zod';
import { z } from 'zod';

import { prisma } from '../prisma';
import { UnreachableError } from '../unreachableError';
import type { VotingCandidate } from './live-states';
import type { ResultsView } from './results';

export interface SingleVoteQuestionFormat {
  type: typeof QuestionType['SingleVote'];
}

export type QuestionFormatDetails = SingleVoteQuestionFormat;

const abstainQuestionResponse = z.object({
  type: z.literal('Abstain'),
});

const singleVoteQuestionResponse = z.object({
  type: z.literal(QuestionType.SingleVote),
  candidateId: z.string(),
});

export const questionResponse = z.union([abstainQuestionResponse, singleVoteQuestionResponse]);
export type QuestionResponse = TypeOf<typeof questionResponse>;

export interface QuestionCandidateWithVotes {
  id: string;
  name: string;
  votes: number;
}

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

export interface CreateQuestionParams {
  question: string;
  candidates: string[];
  details: QuestionFormatDetails;
}

export const prismaQuestionInclude = {
  interactions: true,
  candidates: {
    include: {
      votes: true,
    },
  },
} as const;
export type PrismaQuestionInclude = Question & {
  candidates: (QuestionCandidate & {
    votes: CandidateVote[];
  })[];
  interactions: QuestionInteraction[];
};

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

export async function createRoomQuestion(roomId: string, params: CreateQuestionParams): Promise<RoomQuestion> {
  const created = await prisma.question.create({
    data: {
      roomId,
      question: params.question,
      format: params.details.type,
      candidates: {
        createMany: {
          data: params.candidates.map((candidate) => ({ name: candidate })),
        },
      },
    },
    include: prismaQuestionInclude,
  });

  return mapPrismaQuestionInclude(created);
}

export async function voteForQuestion(
  questionId: string,
  voterId: string,
  response: QuestionResponse
): Promise<RoomQuestion | null> {
  return prisma.$transaction(async (prisma) => {
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question || question.closed) {
      return null;
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

    const newQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: prismaQuestionInclude,
    });

    if (!newQuestion) {
      // This should never happen as we are inside a transaction
      throw new Error('Unexpected error: Failed to find question after updating it');
    }

    return mapPrismaQuestionInclude(newQuestion);
  });
}

export async function closeQuestion(questionId: string, votersPresent: number): Promise<RoomQuestion> {
  const question = await prisma.question.update({
    where: { id: questionId },
    data: { closed: true, votersPresentAtEnd: votersPresent },
    include: prismaQuestionInclude,
  });

  return mapPrismaQuestionInclude(question);
}

export async function createNewQuestion(roomId: string, params: CreateQuestionParams): Promise<RoomQuestion> {
  const question = await prisma.question.create({
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

  return mapPrismaQuestionInclude(question);
}

export async function getAllResultsForRoom(roomId: string) {
  const room = await prisma.room.findUnique({
    where: {
      id: roomId,
    },
    include: {
      users: {
        include: {
          voter: true,
        },
      },
      questions: {
        where: { closed: true },
        orderBy: { createdAt: 'asc' },
        include: prismaQuestionInclude,
      },
    },
  });

  if (!room) {
    throw new Error('Room not found');
  }

  const resultsList = room.questions.map((question) => mapPrismaQuestionInclude(question));

  return resultsList.map((result) => ({
    questionId: result.id,
    name: result.question,
    result: result.results,
  }));
}
