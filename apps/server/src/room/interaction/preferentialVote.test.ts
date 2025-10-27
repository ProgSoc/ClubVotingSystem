import { afterEach, describe, expect, test, vi } from "bun:test";
import crypto from "node:crypto";
import { STVElection } from "./preferentialVote";

describe("rankedElection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("IRV single-seat majority election", () => {
    const election = new STVElection();
    election.addBallot(["Alice", "Bob", "Charlie"]);
    election.addBallot(["Alice", "Charlie", "Bob"]);
    election.addBallot(["Alice", "Bob"]);
    election.addBallot(["Bob", "Alice"]);
    election.addBallot(["Charlie", "Bob"]);

    const result = election.runElection(1);

    expect(result.elected).toEqual(["Alice"]);
    expect(result.eliminated).toEqual([]);
    expect(result.records[0]?.voteTotals).toEqual({
      Alice: 3,
      Bob: 1,
      Charlie: 1,
    });
  });

  test("IRV elimination transfers vote weight to next preference", () => {
    const election = new STVElection();
    election.addBallot(["Alice", "Bob"]);
    election.addBallot(["Alice", "Bob"]);
    election.addBallot(["Bob", "Alice"]);
    election.addBallot(["Bob", "Alice"]);
    election.addBallot(["Charlie", "Bob"]);

    const result = election.runElection(1);

    expect(result.elected).toEqual(["Bob"]);
    expect(result.eliminated).toEqual(["Charlie"]);
    expect(result.records[0]?.voteTotals).toEqual({
      Alice: 2,
      Bob: 2,
      Charlie: 1,
    });
    expect(
      result.records.some((round) =>
        round.eliminatedCandidates.includes("Charlie"),
      ),
    ).toBe(true);
  });

  test("STV surplus redistribution scales ballots even when earlier choice already elected", () => {
    const election = new STVElection();

    for (let i = 0; i < 5; i++) {
      election.addBallot(["Alice", "Bob", "Carol"]);
    }

    for (let i = 0; i < 4; i++) {
      election.addBallot(["Bob", "Alice", "Carol"]);
    }

    for (let i = 0; i < 3; i++) {
      election.addBallot(["Carol", "Alice", "Bob"]);
    }

    const result = election.runElection(2);

    expect(result.elected).toEqual(["Alice", "Bob"]);
    expect(result.eliminated).toEqual(["Carol"]);
    expect(
      result.records.filter((round) =>
        round.electedCandidates.includes("Alice"),
      ).length,
    ).toBe(1);
    expect(
      result.records.filter((round) => round.electedCandidates.includes("Bob"))
        .length,
    ).toBe(1);

    const redistributed = election.getBallotsSnapshot().slice(-3);
    for (const ballot of redistributed) {
      expect(ballot.weight).toBeCloseTo(2 / 7, 10);
      expect(ballot.preferences).toEqual(["Alice"]);
    }
  });

  test("Tie elimination relies on deterministic random break", () => {
    const election = new STVElection();
    const randomSpy = vi
      .spyOn(crypto, "randomInt")
      .mockImplementation(
        ((_max: number) => 1) as unknown as typeof crypto.randomInt,
      );

    election.addBallot(["Alice", "Bob"]);
    election.addBallot(["Bob", "Alice"]);
    election.addBallot(["Carol", "Alice"]);

    const result = election.runElection(1);

    expect(randomSpy).toHaveBeenCalledWith(3);
    const eliminationRound = result.records.find(
      (round) => round.eliminatedCandidates.length > 0,
    );
    expect(eliminationRound?.eliminatedCandidates).toEqual(["Bob"]);
    expect(result.elected).toEqual(["Alice"]);
  });

  test("Ballots exhaust when all ranked candidates are gone", () => {
    const election = new STVElection();
    const randomSpy = vi
      .spyOn(crypto, "randomInt")
      .mockImplementation(
        ((_max: number) => 1) as unknown as typeof crypto.randomInt,
      );

    election.addBallot(["Alice"]);
    election.addBallot(["Bob"]);
    election.addBallot(["Charlie"]);
    election.addBallot(["Charlie"]);

    const result = election.runElection(1);

    expect(randomSpy).toHaveBeenCalled();
    expect(result.elected).toEqual(["Charlie"]);
    expect(result.eliminated).toEqual(["Bob", "Alice"]);
    const eliminationRound = result.records.filter(
      (round) => round.eliminatedCandidates.length === 1,
    );
    expect(eliminationRound[0]?.eliminatedCandidates).toEqual(["Bob"]);
    expect(eliminationRound[1]?.eliminatedCandidates).toEqual(["Alice"]);

    const internalBallots = (
      election as unknown as {
        ballots: Array<{ preferences: string[]; weight: number }>;
      }
    ).ballots;

    const exhausted = internalBallots.filter(
      (ballot) => ballot.preferences.length === 0,
    );
    expect(exhausted.length).toBeGreaterThan(0);
    expect(
      result.records.some((round) => (round.voteTotals["Charlie"] ?? 0) === 2),
    ).toBe(true);
  });

  test("Multi-seat STV handles cascading ballot exhaustion", () => {
    const election = new STVElection();
    const randomSpy = vi
      .spyOn(crypto, "randomInt")
      .mockImplementation(
        ((_max: number) => 1) as unknown as typeof crypto.randomInt,
      );

    for (let i = 0; i < 4; i++) {
      election.addBallot(["Alice", "Carol", "Bob"]);
    }

    for (let i = 0; i < 2; i++) {
      election.addBallot(["Bob", "Carol"]);
    }

    election.addBallot(["Carol"]);

    election.addBallot(["Dave"]);
    election.addBallot(["Eve"]);

    const result = election.runElection(3);

    expect(randomSpy).toHaveBeenCalledWith(2);
    expect(new Set(result.elected)).toEqual(new Set(["Alice", "Bob", "Carol"]));
    expect(result.eliminated).toEqual(["Eve", "Dave"]);

    const exhausted = election
      .getBallotsSnapshot()
      .filter((ballot) => ballot.preferences.length === 0);
    expect(exhausted.length).toBeGreaterThanOrEqual(2);

    const debugSnapshots = election.getDebugSnapshots();
    const tieBreakRound = debugSnapshots.find(
      (snapshot) =>
        snapshot.voteTotals["Dave"] === 1 && snapshot.voteTotals["Eve"] === 1,
    );
    expect(tieBreakRound).toBeDefined();
  });
});
