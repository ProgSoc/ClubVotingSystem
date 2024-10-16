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

  it('if there\'s a tie then don\'t go below the maxElected count', () => {
    const candidates = ['A', 'B'];
    const votes = [['A'], ['B'], ['A'], ['B']];
    const maxElected = 1;

    const result = rankedChoiceVoting(candidates, votes, maxElected);

    expect(result).toEqual([{ id: 'A', votes: 2 }, { id: 'B', votes: 2 }]);
  });

  it('elects the candidate with the most votes after eliminating the candidate with the fewest votes', () => {
    const candidates = ['A', 'B', 'C'];
    const votes = [['A', 'B'], ['B', 'C'], ['C', 'A'], ['C', 'A']];
    const maxElected = 1;

    const result = rankedChoiceVoting(candidates, votes, maxElected);

    expect(result).toEqual([{ id: 'C', votes: 3 }]);
  });

  it('removes people who are not candidates from the votes', () => {
    const candidates = ['A', 'B'];
    const votes = [['C', 'B'], ['A', 'C'], ['C', 'A']];
    const maxElected = 1;

    const result = rankedChoiceVoting(candidates, votes, maxElected);

    expect(result).toEqual([{ id: 'A', votes: 2 }]);
  });
});
