import crypto from "node:crypto";

export interface RoundRecord {
	roundNumber: number;
	eliminatedCandidates: string[];
	electedCandidates: string[];
	voteTotals: Record<string, number>;
}

interface Ballot {
	preferences: string[];
	weight: number;
}

interface DebugSnapshot {
	roundNumber: number;
	elected: string[];
	eliminated: string[];
	remaining: string[];
	voteTotals: Record<string, number>;
	ballots: Ballot[];
}

export class STVElection {
	private ballots: Ballot[] = [];
	private candidateSet: Set<string> = new Set();
	private debugSnapshots: DebugSnapshot[] = [];

	addBallot(preferences: string[]) {
		this.ballots.push({ preferences, weight: 1 });
		preferences.forEach((candidate) => { this.candidateSet.add(candidate) });
	}

	runElection(seats: number) {
		const elected: string[] = [];
		const eliminated: string[] = [];
		const records: RoundRecord[] = [];
		const quota = Math.floor(this.ballots.length / (seats + 1)) + 1;

		let roundNumber = 1;
		this.debugSnapshots = [];

		while (
			elected.length < seats &&
			this.remainingCandidates(elected, eliminated).length > 0
		) {
			// Count first-preference votes with weights
			const voteTotals: Record<string, number> = {};
			const allocations = new Map<string, Ballot[]>();
			for (const candidate of this.remainingCandidates(elected, eliminated)) {
				voteTotals[candidate] = 0;
			}

			for (const ballot of this.ballots) {
				const nextValid = ballot.preferences.find(
					(c) =>
						!elected.includes(c) &&
						!eliminated.includes(c)
				);
				if (nextValid) {
					// biome-ignore lint/style/noNonNullAssertion: The candidate existence is checked above
					voteTotals[nextValid]! += ballot.weight;
					if (!allocations.has(nextValid)) {
						allocations.set(nextValid, []);
					}
					// biome-ignore lint/style/noNonNullAssertion: Map entry exists or created just above
					allocations.get(nextValid)!.push(ballot);
				}
			}

			const newlyElected: string[] = [];

			// Check for candidates reaching quota
			for (const [candidate, votes] of Object.entries(voteTotals)) {
				if (votes >= quota && !elected.includes(candidate)) {
					elected.push(candidate);
					newlyElected.push(candidate);

					// Surplus handling
					const surplus = votes - quota;
					const allocatedBallots = allocations.get(candidate) ?? [];
					this.redistributeSurplus(candidate, surplus, votes, allocatedBallots);
				}
			}

			// Record this round
			records.push({
				roundNumber,
				eliminatedCandidates: [],
				electedCandidates: newlyElected,
				voteTotals: { ...voteTotals },
			});

			this.debugSnapshots.push({
				roundNumber,
				elected: [...elected],
				eliminated: [...eliminated],
				remaining: this.remainingCandidates(elected, eliminated),
				voteTotals: { ...voteTotals },
				ballots: this.snapshotBallots(),
			});

			if (newlyElected.length > 0) {
				roundNumber++;
				continue;
			}

			const remaining = this.remainingCandidates(elected, eliminated);
			const seatsRemaining = seats - elected.length;
			if (remaining.length > 0 && remaining.length <= seatsRemaining) {
				for (const candidate of remaining) {
					elected.push(candidate);
				}

				const lastRecord = records[records.length - 1];
				if (lastRecord) {
					lastRecord.electedCandidates = [
						...lastRecord.electedCandidates,
						...remaining,
					];
				} else {
					records.push({
						roundNumber,
						eliminatedCandidates: [],
						electedCandidates: [...remaining],
						voteTotals: { ...voteTotals },
					});
				}

				break;
			}

			// Eliminate lowest
			const minVotes = Math.min(...Object.values(voteTotals));
			const lowest = Object.entries(voteTotals)
				.filter(([_, v]) => v === minVotes)
				.map(([c]) => c);

			let toEliminate: string;
			if (lowest.length > 1) {
				const index = crypto.randomInt(lowest.length);
				// biome-ignore lint/style/noNonNullAssertion: Random int will always be able to index lowest
				toEliminate = lowest[index]!;
			} else {
				// biome-ignore lint/style/noNonNullAssertion: This is safe as lowest has at least one element
				toEliminate = lowest[0]!;
			}

			eliminated.push(toEliminate);

			// Redistribute all of their ballots fully
			this.redistributeElimination(toEliminate);

			records.push({
				roundNumber,
				eliminatedCandidates: [toEliminate],
				electedCandidates: [],
				voteTotals: { ...voteTotals },
			});

			roundNumber++;
		}

		return { elected, eliminated, records };
	}

	private remainingCandidates(elected: string[], eliminated: string[]) {
		return Array.from(this.candidateSet).filter(
			(c) => !elected.includes(c) && !eliminated.includes(c)
		);
	}

	private redistributeSurplus(
		candidate: string,
		surplus: number,
		totalVotes: number,
		allocatedBallots: Ballot[]
	) {
		if (allocatedBallots.length === 0 || totalVotes === 0) {
			return;
		}

		// Fraction of each ballot to transfer (zero if there is no surplus)
		const transferFraction = surplus > 0 ? surplus / totalVotes : 0;

		for (const ballot of allocatedBallots) {
			const originalWeight = ballot.weight;
			const transferWeight = originalWeight * transferFraction;
			// Only the surplus portion advances; the quota portion is consumed by the elected candidate
			ballot.weight = transferWeight;

			// Remove the elected candidate from preferences so the next option can receive the surplus
			ballot.preferences = ballot.preferences.filter((c) => c !== candidate);

			if (ballot.preferences.length === 0 || transferWeight === 0) {
				ballot.weight = 0;
			}
		}
	}


	private redistributeElimination(candidate: string) {
		for (const ballot of this.ballots) {
			const idx = ballot.preferences.indexOf(candidate);
			if (idx >= 0) {
				// Just remove the eliminated candidate
				ballot.preferences = ballot.preferences.filter((c) => c !== candidate);
			}
		}
	}

	getBallotsSnapshot() {
		return this.snapshotBallots();
	}

	getDebugSnapshots() {
		return this.debugSnapshots.map((snapshot) => ({
			roundNumber: snapshot.roundNumber,
			elected: [...snapshot.elected],
			eliminated: [...snapshot.eliminated],
			remaining: [...snapshot.remaining],
			voteTotals: { ...snapshot.voteTotals },
			ballots: snapshot.ballots.map((ballot) => ({
				preferences: [...ballot.preferences],
				weight: ballot.weight,
			})),
		}));
	}

	private snapshotBallots(): Ballot[] {
		return this.ballots.map((ballot) => ({
			preferences: [...ballot.preferences],
			weight: ballot.weight,
		}));
	}
}
