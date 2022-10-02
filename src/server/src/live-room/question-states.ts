interface CandidateWithVotes {
  candidate: string;
  votes: number;
}

interface BlankState {
  state: 'blank';
}

interface ShowingQuestionState {
  state: 'showing-question';
  question: string;
  candidates: string[];
  allowedVotes: number;
  peopleVoted: number;
  totalPeople: number;
}

interface ShowingResultsState {
  state: 'showing-results';
  question: string;
  candidates: CandidateWithVotes[];
  allowedVotes: number;
  peopleVoted: number;
  totalPeople: number;
}

interface EndedState {
  state: 'ended';
}

export type QuestionSetterState = BlankState | ShowingQuestionState | ShowingResultsState | EndedState;
export type VoterState = BlankState | ShowingQuestionState | ShowingResultsState | EndedState;
export type ProjectorState = BlankState | ShowingQuestionState | ShowingResultsState | EndedState;
