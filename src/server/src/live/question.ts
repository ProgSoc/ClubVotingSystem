import type { TypeOf } from 'zod';
import { z } from 'zod';
import type { QuestionFormat } from '../dbschema/interfaces';

const singleVoteType = 'SingleVote' satisfies QuestionFormat;

const preferentialVoteType = 'PreferentialVote' satisfies QuestionFormat;

export interface SingleVoteQuestionFormat {
  type: typeof singleVoteType;
}

export interface PreferentialVoteQuestionFormat {
  type: typeof preferentialVoteType;
}

export type QuestionFormatDetails = SingleVoteQuestionFormat | PreferentialVoteQuestionFormat;

const abstainQuestionResponse = z.object({
  type: z.literal('Abstain'),
});

const singleVoteQuestionResponse = z.object({
  type: z.literal(singleVoteType),
  candidateId: z.string(),
});

const preferentialVoteQuestionResponse = z.object({
  type: z.literal(preferentialVoteType),
  candidateIds: z.array(z.string()), // Candidate ids in order of preference
});

export const questionResponse = z.union([abstainQuestionResponse, singleVoteQuestionResponse, preferentialVoteQuestionResponse]);
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

export interface PreferentialVoteResultsView {
  type: typeof preferentialVoteType;
  results: CandidateWithVotes[];
}

// TODO: Add more types
export type ResultsView = { abstained: number } & (SingleVoteResultsView | PreferentialVoteResultsView);
