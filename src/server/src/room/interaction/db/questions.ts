import type { CandidateVote, Question, QuestionCandidate, QuestionInteraction } from '@prisma/client';
import { QuestionType } from '@prisma/client';

import { InvalidStateError, NoQuestionOpenError, QuestionAlreadyClosedError } from '@/errors';
import type { QuestionResponse, ResultsView } from '@/live/question';
import type { VotingCandidate } from '@/live/states';
import { prisma } from '@/prisma';
import { UnreachableError } from '@/unreachableError';
import type { CreateQuestionParams, QuestionFormatDetails } from '../../types';
import db from '@/db/client';
import { candidateVote, question, questionCandidate, questionInteraction } from '@/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { SelectCandidateVote, SelectQuestion, SelectQuestionCandidate, SelectQuestionInteraction } from '@/db/types';

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

  originalPrismaQuestionObject: DrizzleQuestionInclude;
}

const drizzleQuestionInclude = {
  interactions: true,
  candidates: {
    with: {
      votes: true,
    },
  },
} as const;

async function getQuestionInformation() {
  return db.query.question.findFirst({
    with: drizzleQuestionInclude,
  });
}

type DrizzleQuestionInclude = NonNullable<Awaited<ReturnType<typeof getQuestionInformation>>>;

function mapDrizzleQuestionInclude(question: DrizzleQuestionInclude): RoomQuestion {
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
    createdAt: new Date(question.createdAt),
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
  let currentQuestionPromise: Promise<RoomQuestion | null> | null = null;

  async function fetchCurrentQuestion() {
    const fetchedQuestion = await db.query.question.findFirst({
      where: eq(question.roomId, roomId),
      orderBy: desc(question.createdAt),
      with: drizzleQuestionInclude,
    });

    if (!fetchedQuestion) {
      return null;
    }

    return mapDrizzleQuestionInclude(fetchedQuestion);
  }

  const fns = {
    currentQuestion: () => {
      if (!currentQuestionPromise) {
        currentQuestionPromise = fetchCurrentQuestion();
      }
      return currentQuestionPromise;
    },
    allQuestions: async () => {
      const fetchedQuestions = await db.query.question.findMany({
        where: eq(question.roomId, roomId),
        orderBy: desc(question.createdAt),
        with: drizzleQuestionInclude,
      });
      const mapped = fetchedQuestions.map((q) => mapDrizzleQuestionInclude(q));
      return mapped;
    },
    createNewQuestion: async (params: CreateQuestionParams) => {
      return db.transaction(async (tx) => {
        const [created] = await tx
          .insert(question)
          .values({
            question: params.question,
            format: params.details.type,
            roomId,
          })
          .returning();

        await tx.insert(questionCandidate).values(
          params.candidates.map((candidate) => ({
            name: candidate,
            questionId: created.id,
          }))
        );

        const createdQuestionPromise = tx.query.question.findFirst({
          where: eq(question.id, created.id),
          with: drizzleQuestionInclude,
        });

        currentQuestionPromise = createdQuestionPromise.then((q) => {
          if (!q) {
            throw new InvalidStateError('Question was not created');
          }
          return mapDrizzleQuestionInclude(q);
        });

        return currentQuestionPromise;
      });
    },
    closeQuestion: async (questionId: string, votersPresent: number) => {
      return db.transaction(async (tx) => {
        const [updatedQuestion] = await tx
          .update(question)
          .set({
            closed: true,
            votersPresentAtEnd: votersPresent,
          })
          .where(eq(question.id, questionId))
          .returning();

        const updatedQuestionPromise = tx.query.question.findFirst({
          where: eq(question.id, questionId),
          with: drizzleQuestionInclude,
        });

        currentQuestionPromise = updatedQuestionPromise.then((q) => {
          if (!q) {
            throw new InvalidStateError('Question was not updated');
          }
          return mapDrizzleQuestionInclude(q);
        });

        return currentQuestionPromise;
      });
    },

    async voteForQuestion(questionId: string, voterId: string, response: QuestionResponse) {
      // return prisma.$transaction(async (prisma) => {
      //   const question = await fns.currentQuestion();

      //   if (!question) {
      //     throw new NoQuestionOpenError();
      //   }

      //   if (question.id !== questionId) {
      //     throw new QuestionAlreadyClosedError();
      //   }

      //   // Create the interaction (if doesnt exist) to add to the vote count
      //   await prisma.questionInteraction.upsert({
      //     create: {
      //       question: { connect: { id: questionId } },
      //       voter: { connect: { id: voterId } },
      //     },
      //     update: {},
      //     where: {
      //       questionId_voterId: { questionId, voterId },
      //     },
      //   });

      //   // Delete all previous votes from the voter for the question
      //   await prisma.candidateVote.deleteMany({
      //     where: {
      //       voterId,
      //       candidate: {
      //         questionId,
      //       },
      //     },
      //   });

      //   // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      //   if (response.type !== question.details.type && response.type !== 'Abstain') {
      //     throw new Error('Invalid response type');
      //   }

      //   switch (response.type) {
      //     case 'Abstain':
      //       // Do nothing, the votes have already been cleare
      //       break;
      //     case 'SingleVote':
      //       await db.insert(candidateVote).values({
      //         candidateId: response.candidateId,
      //         voterId,
      //       });
      //       break;
      //     default:
      //       throw new UnreachableError(response);
      //   }

      //   currentQuestionPromise = null;
      // });

      return db.transaction(async (tx) => {
        const question = await fns.currentQuestion();

        if (!question) {
          throw new NoQuestionOpenError();
        }

        if (question.id !== questionId) {
          throw new QuestionAlreadyClosedError();
        }

        // Create the interaction (if doesnt exist) to add to the vote count
        await tx
          .insert(questionInteraction)
          .values({
            questionId,
            voterId,
          })
          .onConflictDoNothing();

        // Delete all previous votes from the voter for the question
        const previousVotes = await tx
          .select({ candidateId: candidateVote.candidateId, voterId: candidateVote.voterId })
          .from(candidateVote)
          .where(and(eq(candidateVote.voterId, voterId), eq(questionCandidate.questionId, questionId)))
          .innerJoin(questionCandidate, eq(questionCandidate.id, candidateVote.candidateId));

        tx.delete(candidateVote).where(
          and(
            inArray(
              candidateVote.candidateId,
              previousVotes.map((v) => v.candidateId)
            ),
            eq(candidateVote.voterId, voterId)
          )
        );

        

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (response.type !== question.details.type && response.type !== 'Abstain') {
          throw new Error('Invalid response type');
        }

        switch (response.type) {
          case 'Abstain':
            // Do nothing, the votes have already been cleared
            break;
          case 'SingleVote':
            await tx.insert(candidateVote).values({
              candidateId: response.candidateId,
              voterId,
            });
            break;
          default:
            throw new UnreachableError(response);
        }

        currentQuestionPromise = null;
      });
    },

    async getQuestionVote(questionId: string, voterId: string): Promise<QuestionResponse | null> {
      const question = await fns.currentQuestion();

      if (!question || question.id !== questionId) {
        return null;
      }

      const votes: CandidateVote[] = [];
      question.originalPrismaQuestionObject.candidates.forEach((c) => {
        const vote = c.votes.find((v) => v.voterId === voterId);
        if (vote) {
          votes.push(vote);
        }
      });

      if (votes.length === 0) {
        if (question.originalPrismaQuestionObject.interactions.find((i) => i.voterId === voterId)) {
          // If there are no votes but the user interacted, then the user abstained
          return {
            type: 'Abstain',
          };
        } else {
          return null;
        }
      }

      switch (question.details.type) {
        case QuestionType.SingleVote:
          return {
            type: QuestionType.SingleVote,
            candidateId: votes[0].candidateId,
          };
        default:
          throw new UnreachableError(question.details.type);
      }
    },
  };

  return fns;
}
