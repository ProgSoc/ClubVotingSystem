import type { CandidateVote, Question, QuestionCandidate, QuestionType } from '@prisma/client';

import { prisma } from '../../prisma';
import { UnreachableError } from '../unreachableError';

export interface SingleVoteQuestionFormat {
  type: typeof QuestionType['SingleVote'];
}

export type QuestionFormatDetails = SingleVoteQuestionFormat;

export interface AbstainQuestionResponse {
  type: 'Abstain';
}

export interface SingleVoteQuestionResponse {
  type: typeof QuestionType['SingleVote'];
  candidateId: string;
}

export type QuestionResponse = AbstainQuestionResponse | SingleVoteQuestionResponse;

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
  candidates: QuestionCandidateWithVotes[];
}

export interface CreateQuestionParams {
  question: string;
  candidates: string[];
  details: QuestionFormatDetails;
}

export const prismaQuestionInclude = {
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
};

export function mapPrismaQuestionInclude(question: PrismaQuestionInclude): RoomQuestion {
  // Count the number of unique voters by inserting them into a set
  const uniqueVoters = new Set();
  question.candidates.forEach((candidate) => {
    candidate.votes.forEach((vote) => {
      uniqueVoters.add(vote.voterId);
    });
  });

  return {
    id: question.id,
    createdAt: question.createdAt,
    question: question.question,
    closed: question.closed,

    // TODO: Abstract this when more question types are added
    details: {
      type: question.format,
    },

    totalVoters: uniqueVoters.size,
    candidates: question.candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      votes: candidate.votes.length,
    })),
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

export async function closeQuestion(questionId: string): Promise<RoomQuestion> {
  const question = await prisma.question.update({
    where: { id: questionId },
    data: { closed: true },
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
