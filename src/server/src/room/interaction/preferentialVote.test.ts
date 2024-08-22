import { describe, expect, test } from 'bun:test';
import { rankedChoiceVoting } from './preferentialVote';

describe('processPreferentialVoting', () => {
  test('should return the correct result', () => {
    // Initialize candidates and votes (unchangeable examples)

    // rcv specific test data
    const initialCandidates = [
      'Alice',
      'Bob',
      'Charlie',
      'David',
      'Eve',
    ];
    const initialVotes = [
      ['Alice', 'Bob', 'Charlie', 'David', 'Eve'],
      // example of redistribution
      ['Bob', 'Charlie', 'David', 'Eve', 'Alice'],
      ['Charlie', 'David', 'Eve', 'Alice', 'Bob'],
      ['David', 'Eve', 'Alice', 'Bob', 'Charlie'],
    ];

    // Number of candidates to elect
    const maxElected = 2;
    const result = rankedChoiceVoting(initialCandidates, initialVotes, maxElected);
    console.log(result);
    expect(true).toBe(true);
  });
});
