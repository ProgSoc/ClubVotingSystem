import type { QuestionFormatDetails } from './question';

export interface CandidateWithVotes {
  id: string;
  name: string;
  votes: number;
}

export interface VotingCandidate {
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

export interface ShowingQuestionState extends PartialLiveQuestionMetadata {
  state: QuestionState.ShowingQuestion;
  candidates: VotingCandidate[];
}

interface SingleVoteResultsView {
  type: 'SingleVote';
  results: CandidateWithVotes[];
}

// TODO: Add more types
export type ResultsView = SingleVoteResultsView;

interface ShowingResultsState extends PartialLiveQuestionMetadata {
  state: QuestionState.ShowingResults;
  candidates: VotingCandidate[];
  results: ResultsView;
}

interface EndedState {
  state: QuestionState.Ended;
}

export type QuestionSetterState = BlankState | ShowingQuestionState | ShowingResultsState | EndedState;
export type BoardState = BlankState | ShowingQuestionState | ShowingResultsState | EndedState;
export type VoterState = BoardState;
