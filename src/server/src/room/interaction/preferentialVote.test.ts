import { describe, expect, test } from 'bun:test';
import { processPreferentialVoting } from './preferentialVote';

describe('processPreferentialVoting', () => {
  test('should return the correct result', () => {
    const params = {
      maxElected: 1,
      candidateIds: ['1', '2', '3', '4', '5'],
      preferenceLists: [
        ['1', '2', '3', '4', '5'],
        ['5', '4', '3', '2', '1'],
      ],
    };
    const result = processPreferentialVoting(params);
    expect(result).toEqual([{
      id: '3',
      votes: 2,
    }]);
  });
});
