import { describe, expect, it } from 'bun:test';
import { rankedChoiceVoting } from './preferentialVote';

describe('Ranked Choice Voting', () => {
  it('elects the candidate with the most votes', () => {
    const candidates = ['A', 'B'];
    const votes = [['A'], ['B'], ['A']];
    const maxElected = 1;

    const result = rankedChoiceVoting(candidates, votes, maxElected);

    expect(result).toEqual([{ id: 'A', votes: 2 }]);
  });
});
