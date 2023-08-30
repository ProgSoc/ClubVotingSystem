import { QuestionType } from '@prisma/client';
import type { TypeOf } from 'zod';
import { z } from 'zod';

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

export interface CandidateWithVotes {
  id: string;
  name: string;
  votes: number;
}

export interface SingleVoteResultsView {
  type: 'SingleVote';
  results: CandidateWithVotes[];
}

// TODO: Add more types
export type ResultsView = { abstained: number } & SingleVoteResultsView;
