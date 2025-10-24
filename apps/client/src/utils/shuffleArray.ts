function randomInRange(min: number, max: number, seed: Uint8Array = crypto.getRandomValues(new Uint8Array(4))): number {
	const range = max - min + 1;
	const randomValue = (seed[0] << 24) | (seed[1] << 16) | (seed[2] << 8) | seed[3];
	return min + (randomValue % range);
}

export function makeRandomSeed(): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(4));
}

export async function secureShuffle<T>(array: T[], seed: Uint8Array = crypto.getRandomValues(new Uint8Array(4))): Promise<T[]> {
	const promises = [];

	// asynchronously generate an array of random numbers using a CSPRNG
	for (let i = array.length - 1; i > 0; i--) {
		promises.push(randomInRange(0, i, seed));
	}

	const randomNumbers = await Promise.all(promises);

	// apply durstenfeld shuffle with previously generated random numbers
	for (let i = array.length - 1; i > 0; i--) {
		const j = randomNumbers[array.length - i - 1];
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}

	return array;
}