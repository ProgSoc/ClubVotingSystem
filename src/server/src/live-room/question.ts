import type { CandidateVote, Question, QuestionCandidate } from '@prisma/client';

import { prisma } from '../../prisma';

export interface QuestionCandidateWithVotes {
  id: string;
  name: string;
  votes: number;
}

export interface RoomQuestion {
  id: string;
  question: string;
  createdAt: Date;
  maxChoices: number;
  closed: boolean;
  totalVoters: number;
  candidates: QuestionCandidateWithVotes[];
}

export interface CreateQuestionParams {
  question: string;
  maxChoices: number;
  candidates: string[];
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
    maxChoices: question.maxChoices,
    totalVoters: uniqueVoters.size,
    candidates: question.candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      votes: candidate.votes.length,
    })),
  };
}

export async function createRoomQuestion(
  roomId: string,
  question: string,
  candidates: string[],
  maxChoices: number
): Promise<RoomQuestion> {
  const created = await prisma.question.create({
    data: {
      question,
      maxChoices,
      roomId,
      candidates: {
        createMany: {
          data: candidates.map((candidate) => ({ name: candidate })),
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
  candidateIds: string[]
): Promise<RoomQuestion | null> {
  return prisma.$transaction(async (prisma) => {
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question || question.closed) {
      return null;
    }

    if (question.maxChoices < candidateIds.length) {
      throw new Error('Too many choices');
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

    // Create new votes
    await prisma.candidateVote.createMany({
      data: candidateIds.map((candidateId) => ({
        voterId,
        candidateId,
      })),
    });

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
      maxChoices: params.maxChoices,
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
