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
