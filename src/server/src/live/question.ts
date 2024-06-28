import type { TypeOf } from 'zod';
import { z } from 'zod';
import { QuestionFormat } from '../dbschema/interfaces';

const singleVoteType = 'SingleVote' satisfies QuestionFormat;

export interface SingleVoteQuestionFormat {
  type: typeof singleVoteType;
}

export type QuestionFormatDetails = SingleVoteQuestionFormat;

const abstainQuestionResponse = z.object({
  type: z.literal('Abstain'),
});

const singleVoteQuestionResponse = z.object({
  type: z.literal(singleVoteType),
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
  type: typeof singleVoteType;
  results: CandidateWithVotes[];
}

// TODO: Add more types
export type ResultsView = { abstained: number } & SingleVoteResultsView;
