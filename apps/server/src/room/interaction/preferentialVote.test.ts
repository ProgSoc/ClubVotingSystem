import { describe, expect, test } from "bun:test";
import { rankedElection } from "./preferentialVote";

describe("rankedElection", () => {
  test("IRV single-seat majority election", () => {
    const candidates = ["Alice", "Bob", "Charlie"];
    const votes = [
      ["Alice", "Bob", "Charlie"],
      ["Alice", "Charlie", "Bob"],
      ["Bob", "Alice", "Charlie"],
      ["Charlie", "Alice", "Bob"],
      ["Alice", "Bob", "Charlie"],
    ];

    const { elected, rounds } = rankedElection(candidates, votes, 1);

    // ✅ Alice should have majority (3 of 5)
    expect(elected[0]?.id).toBe("Alice");
    expect(elected[0]?.votes).toBeGreaterThanOrEqual(3);

    // Ensure at least 1 round happened
    expect(rounds.length).toBeGreaterThan(0);
  });

  test("STV 2-seat election with surplus redistribution", () => {
    const candidates = ["Alice", "Bob", "Charlie", "Diana"];
    const votes = [
      ["Alice", "Bob", "Charlie", "Diana"],
      ["Alice", "Charlie", "Bob", "Diana"],
      ["Bob", "Alice", "Charlie", "Diana"],
      ["Charlie", "Alice", "Bob", "Diana"],
      ["Diana", "Charlie", "Alice", "Bob"],
      ["Alice", "Bob", "Charlie", "Diana"],
      ["Bob", "Diana", "Charlie", "Alice"],
    ];

    const { elected, rounds } = rankedElection(candidates, votes, 2);

    // Should return exactly 2 winners
    expect(elected.length).toBe(2);

    // Verify that each elected candidate is among the initial candidates
    elected.forEach((e) => {
      expect(candidates).toContain(e.id);
      expect(typeof e.votes).toBe("number");
    });

    // Ensure there are transfer records in at least one round
    const anyTransfers = rounds.some((r) => r.transfers.length > 0);
    expect(anyTransfers).toBe(true);
  });

  test("Deterministic tie-breaker produces consistent result", () => {
    const candidates = ["A", "B"];
    const votes = [
      ["A", "B"],
      ["B", "A"],
    ];

    const result1 = rankedElection(candidates, votes, 1, "seed123");
    const result2 = rankedElection(candidates, votes, 1, "seed123");

    // Same seed → same outcome
    expect(result1.elected[0]?.id).toBe(result2.elected[0]?.id);

    // Different seed → may change
    const result3 = rankedElection(candidates, votes, 1, "different-seed");
    expect(result3.elected[0]?.id).toBeOneOf(["A", "B"]);
  });

  test("Handles all votes exhausted (no preferences left)", () => {
    const candidates = ["A", "B"];
    const votes = [["A"], ["B"], []];

    const { elected, rounds } = rankedElection(candidates, votes, 1);
    expect(elected.length).toBe(1);
    expect(["A", "B"]).toContain(elected[0]?.id as string);
    expect(rounds.length).toBeGreaterThan(0);
  });

  test("Fills remaining seats deterministically when insufficient candidates reach quota", () => {
    const candidates = ["A", "B", "C"];
    const votes = [
      ["A", "B", "C"],
      ["B", "C", "A"],
      ["C", "A", "B"],
    ];

    const { elected } = rankedElection(candidates, votes, 2);

    // Should elect exactly 2
    expect(elected.length).toBe(2);
    // No duplicates
    const ids = elected.map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });

  test("Handles case with no votes cast", () => {
    const candidates = ["A", "B", "C"];
    const votes: string[][] = [];

    const { elected, rounds } = rankedElection(candidates, votes, 2);

    // No votes → no one elected
    expect(elected.length).toBe(0);
    expect(rounds.length).toBe(0);
  });

  test("Handles case with no candidates", () => {
    const candidates: string[] = [];
    const votes = [
      ["A", "B"],
      ["B", "A"],
    ];

    const { elected, rounds } = rankedElection(candidates, votes, 1);

    // No candidates → no one elected
    expect(elected.length).toBe(0);
    expect(rounds.length).toBe(0);
  })

  test("Handles all candidates being eliminated without reaching quota", () => {
    const candidates = ["A", "B", "C"];
    const votes = [
      ["A"],
      ["B"],
      ["C"],
    ];

    const { elected } = rankedElection(candidates, votes, 2);

    // Should elect exactly 2
    expect(elected.length).toBe(2);
    // No duplicates
    const ids = elected.map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  })

  test("Handles tie situations during elimination", () => {
    const candidates = ["A", "B", "C"];
    const votes = [
      ["A", "B", "C"],
      ["B", "A", "C"],
      ["C", "A", "B"],
      ["C", "B", "A"],
    ];

    const { elected, rounds } = rankedElection(candidates, votes, 1, "tie-seed");

    // Should elect exactly 1
    expect(elected.length).toBe(1);
    // Elected candidate should be among the initial candidates
    expect(candidates).toContain(elected[0]?.id as string);
    // Ensure rounds were processed
    expect(rounds.length).toBeGreaterThan(0);
  });

  test("Handles tie situations during surplus transfer", () => {
    const candidates = ["A", "B", "C"];
    const votes = [
      ["A", "B", "C"],
      ["A", "C", "B"],
      ["B", "A", "C"],
      ["C", "A", "B"],
      ["C", "B", "A"],
      ["C", "B", "A"],
    ];

    const { elected, rounds } = rankedElection(candidates, votes, 2, "surplus-tie");

    // Should elect exactly 2
    expect(elected.length).toBe(2);
    // Elected candidates should be among the initial candidates
    elected.forEach((e) => {
      expect(candidates).toContain(e.id);
    });
    // Ensure rounds were processed
    expect(rounds.length).toBeGreaterThan(0);
  })

  test("Handles all votes being exhausted before filling seats", () => {
    const candidates = ["A", "B", "C"];
    const votes = [
      ["A"],
      ["B"],
      ["C"],
      [],
      [],
    ];

    const { elected, rounds } = rankedElection(candidates, votes, 2);

    // Should elect exactly 2
    expect(elected.length).toBe(2);
    // Elected candidates should be among the initial candidates
    elected.forEach((e) => {
      expect(candidates).toContain(e.id);
    });
    // Ensure rounds were processed
    expect(rounds.length).toBeGreaterThan(0);
  })

  test("should elect a single winner in a simple majority case", () => {
    const candidates = ["Alice", "Bob", "Carol"];
    const votes = [
      ["Alice", "Bob", "Carol"],
      ["Alice", "Carol", "Bob"],
      ["Bob", "Alice", "Carol"],
      ["Alice", "Bob", "Carol"],
    ];
    const result = rankedElection(candidates, votes, 1);

    expect(result.elected).toHaveLength(1);
    expect(result.elected[0]?.id).toBe("Alice");
    expect(result.elected[0]?.votes).toBeGreaterThan(0);
    expect(result.rounds.length).toBeGreaterThanOrEqual(1);
  });

  test("should handle elimination and redistribution correctly", () => {
    const candidates = ["Alice", "Bob", "Carol"];
    const votes = [
      ["Bob", "Alice", "Carol"],
      ["Carol", "Alice", "Bob"],
      ["Alice", "Bob", "Carol"],
    ];
    const result = rankedElection(candidates, votes, 1);

    // Expect one winner
    expect(result.elected).toHaveLength(1);
    const winner = result.elected[0]?.id;

    // Because every candidate gets one first-preference vote,
    // tie-breaking or redistribution determines the winner
    expect(["Alice", "Bob", "Carol"]).toContain(winner as string);
    expect(result.rounds.length).toBeGreaterThanOrEqual(1);
  });

  test("should elect multiple winners when seats > 1", () => {
    const candidates = ["Alice", "Bob", "Carol", "Dave"];
    const votes = [
      ["Alice", "Bob", "Carol", "Dave"],
      ["Bob", "Alice", "Dave", "Carol"],
      ["Carol", "Dave", "Bob", "Alice"],
      ["Dave", "Carol", "Bob", "Alice"],
    ];

    const result = rankedElection(candidates, votes, 2);

    expect(result.elected).toHaveLength(2);
    for (const elected of result.elected) {
      expect(candidates).toContain(elected.id);
      expect(elected.votes).toBeGreaterThanOrEqual(0);
    }
  });

  test("should produce deterministic results given the same seed", () => {
    const candidates = ["Alice", "Bob", "Carol"];
    const votes = [
      ["Bob", "Alice", "Carol"],
      ["Carol", "Alice", "Bob"],
      ["Alice", "Bob", "Carol"],
    ];

    const result1 = rankedElection(candidates, votes, 1, "fixed-seed");
    const result2 = rankedElection(candidates, votes, 1, "fixed-seed");

    expect(result1.elected[0]?.id).toBe(result2.elected[0]?.id);
  });

  test("should handle empty votes gracefully", () => {
    const candidates = ["Alice", "Bob"];
    const votes: string[][] = [];
    const result = rankedElection(candidates, votes, 1);

    expect(result.elected).toHaveLength(0);
    expect(result.rounds).toEqual([]);
  });

});
