import crypto from "node:crypto";

interface CandidateWithVotes {
	id: string;
	votes: number;
}

interface TransferLogEntry {
	from: string;
	to?: string;
	type: "surplus" | "elimination";
	transferred: number;
	note?: string;
}

export interface RoundRecord {
	round: number;
	counts: Record<string, number>;
	elected?: string[];
	eliminated?: string[];
	transfers: TransferLogEntry[];
}

/**
 * Calculate Droop quota (or majority for 1-seat elections)
 */
function calculateQuota(totalVotes: number, seats: number): number {
	if (seats === 1) return Math.floor(totalVotes / 2) + 1; // IRV majority
	return Math.floor(totalVotes / (seats + 1)) + 1; // STV Droop quota
}

/**
 * Count first-preference votes for remaining candidates
 */
function tallyVotes(candidates: readonly string[], votes: readonly string[][]) {
	const counts: Record<string, number> = {};
	candidates.forEach((c) => { counts[c] = 0 });
	votes.forEach((vote) => {
		const first = vote.find((c) => candidates.includes(c));
		if (first) counts[first] = (counts[first] ?? 0) + 1;
	});
	return counts;
}

/**
 * Redistribute surplus votes proportionally with log
 * (Fixed: handles fractional surplus correctly)
 */
function transferSurplus(
	votes: readonly string[][],
	elected: string,
	surplus: number,
	totalVotesForElected: number,
	remainingCandidates: readonly string[],
	transfers: TransferLogEntry[],
): string[][] {
	if (totalVotesForElected <= 0 || surplus <= 0) return [...votes];

	const weightFraction = surplus / totalVotesForElected;
	const redistributed: string[][] = [];
	const retained: string[][] = [];

	const transferCounts: Record<string, number> = {};

	votes.forEach((vote) => {
		if (vote[0] === elected) {
			const nextPrefs = vote.filter((c) => remainingCandidates.includes(c));
			if (nextPrefs.length > 0) {
				const to = nextPrefs[0] as string;
				transferCounts[to] = (transferCounts[to] ?? 0) + weightFraction;
				redistributed.push(nextPrefs);
			}
		} else {
			retained.push(vote);
		}
	});

	// Record aggregated transfers
	for (const [to, amount] of Object.entries(transferCounts)) {
		transfers.push({
			from: elected,
			to,
			transferred: amount,
			type: "surplus",
		});
	}

	return [...retained, ...redistributed];
}

/**
 * Deterministic hybrid tie-breaker
 */
function deterministicTieBreak(
	tiedCandidates: string[],
	history: Record<string, number[]>,
	firstRoundCounts: Record<string, number>,
	electionSeed: string,
): string {
	if (tiedCandidates.length === 1) return tiedCandidates[0] as string;

	let currentTies = [...tiedCandidates];
	const allRounds = Object.values(history).map((v) => v.length);
	if (allRounds.length === 0) return currentTies.sort()[0] as string;

	const rounds = Math.max(...allRounds);

	// 1️⃣ Compare previous rounds
	for (let r = Math.max(rounds - 2, 0); r >= 0; r--) {
		const scores = currentTies.map((c) => history[c]?.[r] ?? 0);
		const max = Math.max(...scores);
		const filtered = currentTies.filter((_c, i) => scores[i] === max);
		if (filtered.length === 1) return filtered[0] as string;
		currentTies = filtered;
	}

	// 2️⃣ Compare first-preference counts
	const maxFirst = Math.max(...currentTies.map((c) => firstRoundCounts[c] ?? 0));
	const filtered = currentTies.filter(
		(c) => (firstRoundCounts[c] ?? 0) === maxFirst,
	);
	if (filtered.length === 1) return filtered[0] as string;

	// 3️⃣ Hash-based deterministic randomness
	const hashScores = filtered.map((c) => {
		const hash = crypto.createHash("sha256").update(electionSeed + c).digest("hex");
		return parseInt(hash.slice(0, 8), 16);
	});
	const maxHash = Math.max(...hashScores);
	const hashedFiltered = filtered.filter((_c, i) => hashScores[i] === maxHash);
	if (hashedFiltered.length === 1) return hashedFiltered[0] as string;

	// 4️⃣ Alphabetical fallback
	return hashedFiltered.sort()[0] as string;
}

/**
 * Unified IRV/STV function
 * @param candidates list of candidate IDs
 * @param votes list of votes, each as ordered list of candidate IDs
 * @param seats number of seats to fill
 * @param electionSeed optional seed for deterministic tie-breaking
 * @returns elected candidates with vote counts and round records
 */
export function rankedElection(
	candidates: readonly string[],
	votes: readonly string[][],
	seats: number,
	electionSeed = "default-seed",
): { elected: CandidateWithVotes[]; rounds: RoundRecord[] } {
	if (votes.length === 0) {
		return { elected: [], rounds: [] };
	}

	let remaining = [...candidates];
	let workingVotes = votes.map((v) => v.filter((c) => candidates.includes(c)));
	const totalVotes = votes.length;
	const quota = calculateQuota(totalVotes, seats);

	const elected: CandidateWithVotes[] = [];
	const history: Record<string, number[]> = {};
	const firstRoundCounts = tallyVotes(candidates, workingVotes);
	const rounds: RoundRecord[] = [];

	candidates.forEach((c) => { history[c] = [] });

	let round = 1;
	while (elected.length < seats && remaining.length > 0) {
		const counts = tallyVotes(remaining, workingVotes);
		if (Object.keys(counts).length === 0) break;

		remaining.forEach((c) => { history[c]?.push(counts[c] ?? 0) });

		const roundRecord: RoundRecord = {
			round,
			counts: { ...counts },
			transfers: [],
		};

		// 🔹 Elected by quota
		const winners = Object.entries(counts)
			.filter(([_, v]) => v >= quota)
			.sort(([a], [b]) => a.localeCompare(b));

		if (winners.length > 0) {
			roundRecord.elected = [];
			for (const [cand, votesForCand] of winners) {
				if (!remaining.includes(cand)) continue;
				elected.push({ id: cand, votes: votesForCand });
				remaining = remaining.filter((c) => c !== cand);
				roundRecord.elected.push(cand);

				const surplus = votesForCand - quota;
				if (seats > 1 && surplus > 0 && remaining.length > 0) {
					workingVotes = transferSurplus(
						workingVotes,
						cand,
						surplus,
						votesForCand,
						remaining,
						roundRecord.transfers,
					);
				} else {
					workingVotes = workingVotes.filter((v) => v[0] !== cand);
				}

				if (elected.length >= seats) break;
			}

			rounds.push(roundRecord);
			round++;
			continue;
		}

		// 🔹 No one reached quota → eliminate lowest
		const minVotes = Math.min(...Object.values(counts));
		let lowest = Object.entries(counts)
			.filter(([_, v]) => v === minVotes)
			.map(([c]) => c);

		if (lowest.length > 1) {
			const eliminated = deterministicTieBreak(
				lowest,
				history,
				firstRoundCounts,
				electionSeed,
			);
			lowest = [eliminated];
		}

		if (lowest.length === 0) break;

		const eliminated = lowest[0] as string;
		roundRecord.eliminated = [eliminated];

		// Record transfers from elimination
		const transferCounts: Record<string, number> = {};
		workingVotes.forEach((vote) => {
			if (vote[0] === eliminated) {
				const next = vote.find((c) => remaining.includes(c) && c !== eliminated);
				if (next) transferCounts[next] = (transferCounts[next] ?? 0) + 1;
			}
		});
		for (const [to, amount] of Object.entries(transferCounts)) {
			roundRecord.transfers.push({
				from: eliminated,
				to,
				transferred: amount,
				type: "elimination",
			});
		}

		remaining = remaining.filter((c) => c !== eliminated);
		workingVotes = workingVotes.map((v) => v.filter((c) => c !== eliminated));

		rounds.push(roundRecord);
		round++;
	}

	// 🧩 Fill remaining seats deterministically if needed
	if (elected.length < seats) {
		const counts = tallyVotes(remaining, workingVotes);

		// Start with remaining candidates
		const fillPool = [...remaining];

		// If no one remaining (all eliminated), revert to all original candidates
		if (fillPool.length === 0) fillPool.push(...candidates);

		// Remove already elected from the pool
		const alreadyElected = new Set(elected.map((e) => e.id));
		const available = fillPool.filter((c) => !alreadyElected.has(c)).sort();

		for (const c of available) {
			elected.push({ id: c, votes: counts[c] || 0 });
			if (elected.length >= seats) break;
		}
	}



	return { elected: elected.slice(0, seats), rounds };
}
