export class UnreachableError extends Error {
	constructor(_val: never) {
		super("Unreachable");
	}
}
