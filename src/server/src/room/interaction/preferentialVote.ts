/**
 * This file contains the logic for ranked-choice voting.
 * @param candidates Array of candidate identifiers
 * @param votes Array of arrays of candidate identifiers, representing votes, in order of preference
 * @returns Array of candidates and their votes
 */
function tallyVotes(candidates: readonly string[], votes: readonly string[][]): Record<string, number> {
  const voteCounts: Record<string, number> = {};
  candidates.forEach((candidate) => {
    voteCounts[candidate] = 0;
  });

  // Tally first-choice votes
  votes.forEach((vote) => {
    const firstChoice = vote[0];
    if (voteCounts[firstChoice] !== undefined) {
      voteCounts[firstChoice] += 1;
    }
  });

  return voteCounts;
}

/**
 * Find the candidate(s) with the fewest votes.
 * @param voteCounts Current vote counts for each candidate
 * @returns Array of candidate identifiers with the fewest votes
 */
function findLowestVoteCandidates(voteCounts: Record<string, number>): readonly string[] {
  let minVotes = Infinity;
  let lowestCandidates: string[] = [];
  for (const candidate in voteCounts) {
    if (voteCounts[candidate] < minVotes) {
      minVotes = voteCounts[candidate];
      lowestCandidates = [candidate];
    }
    else if (voteCounts[candidate] === minVotes) {
      lowestCandidates.push(candidate);
    }
  }
  return lowestCandidates;
}

/**
 * A helper function to reassign votes from eliminated candidates to remaining candidates.
 * @param votes The current votes
 * @param candidatesToRemove Array of candidate identifiers to remove
 * @returns New preference lists with eliminated candidates removed
 */
function reassignVotes(votes: readonly string[][], candidatesToRemove: readonly string[]): readonly string[][] {
  return votes.map(vote => vote.filter(candidate => !candidatesToRemove.includes(candidate))).filter(vote => vote.length > 0);
}

interface CandidateWithVotes {
  id: string;
  votes: number;
}

/**
 * Perform ranked-choice voting.
 * @param candidates Array of strings representing candidate identifiers
 * @param votes Array of arrays of strings representing votes, in order of preference
 * @param maxElected Maximum number of candidates to elect
 * @returns Array of strings representing the elected candidates
 */
export function rankedChoiceVoting(candidates: readonly string[], votes: readonly string[][], maxElected: number): readonly CandidateWithVotes[] {
  const electedCandidates: string[] = [];

  while (electedCandidates.length < maxElected) {
    // Tally the current votes
    const voteCounts = tallyVotes(candidates, votes);

    // Check if we have enough candidates to meet maxElected
    if (candidates.length <= maxElected) {
      // Add remaining candidates to elected list
      electedCandidates.push(...candidates);
      return electedCandidates.map(candidate => ({ id: candidate, votes: voteCounts[candidate] }));
    }

    // Find the candidates with the fewest votes
    const lowestCandidates = findLowestVoteCandidates(voteCounts);

    // Determine if eliminating these candidates would drop below maxElected
    if (candidates.length - lowestCandidates.length >= maxElected) {
      // Eliminate the candidates with the fewest votes
      candidates = candidates.filter(candidate => !lowestCandidates.includes(candidate));

      // Reassign votes from the eliminated candidates to remaining candidates
      votes = reassignVotes(votes, lowestCandidates);
    }
    else {
      // If we can't eliminate without dropping below maxElected, we stop
      electedCandidates.push(...candidates);
      return electedCandidates.map(candidate => ({ id: candidate, votes: voteCounts[candidate] }));
    }
  }

  return electedCandidates.map(candidate => ({ id: candidate, votes: 0 }));
}
