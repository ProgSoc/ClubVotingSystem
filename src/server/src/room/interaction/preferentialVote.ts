interface PreferentialVotingParams {
  maxElected: number; // Number of candidates to elect
  candidateIds: string[]; // List of candidate ids
  preferenceLists: string[][]; // Each string[] is a list of candidate ids in order of preference
}

type PreferentialVotingResult = {
  /** Candidate Id */
  id: string;
  /** Number of Votes after redistribution of eliminated candidates */
  votes: number;
}[];

/**
 * Process preferential voting
 *
 * This function calculates the results of a preferential voting election
 *
 * Given a maximum number of candidates to elect, a list of candidate ids and a list of preference lists,
 * this function calculates the results of the preferential voting election.
 *
 * Steps:
 * 1. Initialize votes map with 0 votes for each candidate
 * 2. Count first preferences
 * 3. Find the candidate with the fewest votes
 * 4. Redistribute votes of the eliminated candidate
 * 5. Remove the eliminated candidate from the votes map
 * 6. Repeat steps 3-5 until the number of candidates is equal to the maximum number of candidates to elect
 * 7. Convert votes map to array and sort by votes in descending order
 *
 * @param params
 * @returns Preferential voting results
 */
export function processPreferentialVoting(params: PreferentialVotingParams): PreferentialVotingResult {
  const { maxElected, candidateIds, preferenceLists } = params;

  // Initialize votes map with 0 votes for each candidate
  const votes = new Map(candidateIds.map(id => [id, 0]));
  console.log('Initialized Votes', votes);

  /**
   * Find the candidate with the fewest votes
   *
   * @returns The id of the candidate with the fewest votes or null if no candidate is found
   */
  const findLowestCandidates = (): Array<string> => {
    const sortedCandidates = Array.from(votes.entries())
      .map(([id, voteCount]) => ({
        id,
        votes: voteCount,
      }))
      .sort((a, b) => a.votes - b.votes);

    const lowestVoteCount = sortedCandidates[0].votes;
    return sortedCandidates.filter(candidate => candidate.votes === lowestVoteCount).map(candidate => candidate.id);
  };

  /**
   * Redistribute votes of the eliminated candidate
   *
   * Lowest number of votes in the current round is eliminated and their votes are redistributed to the next preference
   *
   * @param eliminatedId The id of the candidate that has been eliminated
   */
  const redistributeVotes = (eliminatedId: string) => {
    preferenceLists.forEach((preferenceList, index) => {
      const eliminatedIndex = preferenceList.indexOf(eliminatedId);
      if (index > -1) {
        const newPreferences = preferenceList.slice();
        newPreferences.splice(eliminatedIndex, 1);
        const newFirstChoice = newPreferences[0];
        if (newFirstChoice) {
          votes.set(newFirstChoice, (votes.get(newFirstChoice) ?? 0) + 1);
        }
        preferenceLists[index] = newPreferences;
      }
      // Update preference list
    });
  };

  // Count first preferences
  preferenceLists.forEach((preferenceList) => {
    const firstChoice = preferenceList[0];
    votes.set(firstChoice, (votes.get(firstChoice) ?? 0) + 1);
  });

  while (votes.size > maxElected) {
    // Find the candidate with the fewest votes
    const lowestCandidates = findLowestCandidates();

    // if multiple candidates have the fewest votes, check that removing them will not result in the number of candidates being less than the maximum number of candidates to elect
    if (lowestCandidates.length > 1 && votes.size - lowestCandidates.length < maxElected) {
      break;
    }

    // If there is a tie, all candidates with the fewest votes are eliminated
    lowestCandidates.forEach((lowestCandidate) => {
      redistributeVotes(lowestCandidate);
      votes.delete(lowestCandidate);
    });
  }

  // Convert votes map to array and sort by votes in descending order
  const sortedCandidates = Array.from(votes.entries())
    .map(([id, redistributedVoteCount]) => ({
      id,
      votes: redistributedVoteCount,
    }))
    .sort((a, b) => b.votes - a.votes);

  return sortedCandidates;
}
