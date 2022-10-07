import type { QuestionFormatDetails } from './question';

export interface CandidateWithVotes {
  id: string;
  name: string;
  votes: number;
}

export interface CandidateWithoutVotes {
  id: string;
  name: string;
}

export enum QuestionState {
  Blank = 'Blank',
  ShowingQuestion = 'ShowingQuestion',
  ShowingResults = 'ShowingResults',
  Ended = 'Ended',
}

interface BlankState {
  state: QuestionState.Blank;
  totalPeople: number;
}

export interface PartialLiveQuestionMetadata {
  questionId: string;
  question: string;
  details: QuestionFormatDetails;
  peopleVoted: number;
  totalPeople: number;
}

interface ShowingQuestionState extends PartialLiveQuestionMetadata {
  state: QuestionState.ShowingQuestion;
  candidates: CandidateWithoutVotes[];
}

interface ShowingResultsState extends PartialLiveQuestionMetadata {
  state: QuestionState.ShowingResults;
  candidates: CandidateWithVotes[];
}

interface EndedState {
  state: QuestionState.Ended;
}

export type QuestionSetterState = BlankState | ShowingQuestionState | ShowingResultsState | EndedState;
export type BoardState = BlankState | ShowingQuestionState | ShowingResultsState | EndedState;
export type VoterState = BoardState;
