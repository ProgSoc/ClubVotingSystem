import { describe, expect, it } from "bun:test";
import { rankedChoiceVoting } from "./preferentialVote";

describe("Ranked Choice Voting", () => {
	it("elects the candidate with the most votes", () => {
		const candidates = ["A", "B"];
		const votes = [["A"], ["B"], ["A"]];
		const maxElected = 1;

		const result = rankedChoiceVoting(candidates, votes, maxElected);
		// first round input is a,b,a
		// b is eliminated
		// second round input is a,a

		expect(result).toEqual([{ id: "A", votes: 2 }]);
	});

	it("if there's a tie then don't go below the maxElected count", () => {
		const candidates = ["A", "B"];
		const votes = [["A"], ["B"], ["A"], ["B"]];
		const maxElected = 1;

		const result = rankedChoiceVoting(candidates, votes, maxElected);
		// first round input is a,b,a,b
		// a and b are tied, but we only want to elect 1 so we don't go to the second round
		// so the result is a tie

		expect(result).toEqual([
			{ id: "A", votes: 2 },
			{ id: "B", votes: 2 },
		]);
	});

	it("elects the candidate with the most votes after eliminating the candidate with the fewest votes", () => {
		const candidates = ["A", "B", "C"];
		const votes = [
			["A", "B"],
			["B", "C"],
			["C", "A"],
			["C", "A"],
		];
		const maxElected = 1;

		const result = rankedChoiceVoting(candidates, votes, maxElected);
		// first round input is a,b,c,c
		// b and a are eliminated
		// second round input is c,c,c

		expect(result).toEqual([{ id: "C", votes: 3 }]);
	});

	it("elects the candidate with the most votes after eliminating the candidate with the fewest votes, even if the eliminated candidate was the first choice of some voters", () => {
		const candidates = ["A", "B", "C"];
		const votes = [
			["A", "B"],
			["B", "C"],
			["C", "A"],
			["C", "A"],
			["A", "B"],
		];
		const maxElected = 1;

		const result = rankedChoiceVoting(candidates, votes, maxElected);
		// first round input is a,b,c,c,a
		// b is eliminated
		// second round input is a,c,c,c,a
		// a is eliminated
		// third round input is c,c,c

		expect(result).toEqual([{ id: "C", votes: 3 }]);
	});

	it("removes people who are not candidates from the votes", () => {
		const candidates = ["A", "B"];
		const votes = [
			["C", "B"],
			["A", "C"],
			["C", "A"],
		];
		const maxElected = 1;

		const result = rankedChoiceVoting(candidates, votes, maxElected);
		// c is removed
		// first round input is b,a,a
		// b is removed
		// second round input is a,a

		expect(result).toEqual([{ id: "A", votes: 2 }]);
	});

	// edge cases
	it("elects all candidates when there are no votes", () => {
		const candidates = ["A", "B"];
		const votes: string[][] = [];
		const maxElected = 1;

		const result = rankedChoiceVoting(candidates, votes, maxElected);

		expect(result).toEqual([
			{ id: "A", votes: 0 },
			{ id: "B", votes: 0 },
		]);
	});

	// handle multiple candidates being elected
	it("elects all candidates when there are enough votes", () => {
		const candidates = ["A", "B", "C"];
		const votes = [
			["A", "B"],
			["B", "C"],
			["C", "A"],
			["C", "A"],
			["A", "B"],
			["A", "B"],
		];
		const maxElected = 2;

		const result = rankedChoiceVoting(candidates, votes, maxElected);
		// first round input is a,b,c,c,a,a
		// b is eliminated
		// second round input is a,c,c,c,a,a
		// c is eliminated
		// third round input is a,a,a

		expect(result).toEqual([
			{ id: "A", votes: 3 },
			{ id: "C", votes: 3 },
		]); // A and C are tied
	});
});
