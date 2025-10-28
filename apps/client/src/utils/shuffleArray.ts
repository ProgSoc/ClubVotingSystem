function makePRNG(seed: number) {
	let state = seed >>> 0;
	return () => {
		// xorshift32
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return state >>> 0;
	};
}

export function makeRandomSeed(): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(4));
}

function randomInRange(min: number, max: number, nextRand: () => number): number {
	const range = max - min + 1;
	const maxRand = 0xFFFFFFFF;
	const limit = Math.floor(maxRand / range) * range;

	let randomValue: number;
	do {
		randomValue = nextRand();
	} while (randomValue >= limit);

	return min + (randomValue % range);
}

export function secureShuffle<T>(array: T[], seedArray?: Uint8Array): T[] {
	// Convert Uint8Array seed (4 bytes) into 32-bit integer
	const seed =
		seedArray
			? ((seedArray[0] << 24) | (seedArray[1] << 16) | (seedArray[2] << 8) | seedArray[3]) >>> 0
			: crypto.getRandomValues(new Uint8Array(4)).reduce((acc, v, i) => acc | (v << ((3 - i) * 8)), 0);

	const nextRand = makePRNG(seed);
	const result = array.slice();

	// Fisher–Yates shuffle using seeded randoms
	for (let i = result.length - 1; i > 0; i--) {
		const j = randomInRange(0, i, nextRand);
		[result[i], result[j]] = [result[j], result[i]];
	}

	return result;
}
