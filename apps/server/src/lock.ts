interface PromiseQueue {
	promise: Promise<any>;
	unresolvedCount: number;
}

export class AyncKeyLock {
	private queues: Map<string, PromiseQueue>;

	constructor() {
		this.queues = new Map();
	}

	async lock<T>(key: string, fn: () => Promise<T>) {
		if (!this.queues.has(key)) {
			this.queues.set(key, {
				promise: Promise.resolve(),
				unresolvedCount: 0,
			});
		}

		const queue = this.queues.get(key)!;

		queue.unresolvedCount++;
		const newPromise = queue.promise.then(() => {
			return fn();
		});

		queue.promise = newPromise.catch(console.log).finally(() => {
			queue.unresolvedCount--;
			if (queue.unresolvedCount === 0) {
				this.queues.delete(key);
			}
		});

		return newPromise;
	}
}

export class AsyncLock {
	private queue: PromiseQueue;

	constructor() {
		this.queue = {
			promise: Promise.resolve(),
			unresolvedCount: 0,
		};
	}

	async lock<T>(fn: () => Promise<T>) {
		this.queue.unresolvedCount++;
		const newPromise = this.queue.promise.then(() => {
			return fn();
		});

		this.queue.promise = newPromise.catch(console.log).finally(() => {
			this.queue.unresolvedCount--;
		});

		return newPromise;
	}

	wrapFn<Args extends readonly any[], Ret = void>(
		fn: (...args: Args) => Promise<Ret>,
	): (...args: Args) => Promise<Ret> {
		return (...args: Args) => {
			return this.lock(() => {
				return fn(...args);
			});
		};
	}
}
