import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getTrackedCharacters, upsertPlayer, updatePlayerRating } = vi.hoisted(() => ({
  getTrackedCharacters: vi.fn(),
  upsertPlayer: vi.fn(),
  updatePlayerRating: vi.fn(),
}));
vi.mock("../db/queries.js", () => ({
  getTrackedCharacters,
  upsertPlayer,
  updatePlayerRating,
}));

const { getPlayerById } = vi.hoisted(() => ({
  getPlayerById: vi.fn(),
}));
vi.mock("../puddlefarm/client.js", () => ({
  getPlayerById,
}));

import { syncLeaderboardRatings, syncPlayerRatings } from "./sync.js";

describe("syncPlayerRatings", () => {
  const guildId = "guild-1";
  const playerId = "12345";
  const leaderboardName = "board";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when there are no tracked characters", async () => {
    getTrackedCharacters.mockResolvedValue([]);

    await syncPlayerRatings(guildId, leaderboardName, playerId);

    expect(getPlayerById).not.toHaveBeenCalled();
    expect(upsertPlayer).not.toHaveBeenCalled();
    expect(updatePlayerRating).not.toHaveBeenCalled();
  });
  it("throws when the player can't be found", async () => {
    getTrackedCharacters.mockResolvedValue(["SO"]);
    getPlayerById.mockResolvedValue(null);
    await expect(syncPlayerRatings(guildId, leaderboardName, playerId)).rejects.toThrow(
      `player ${playerId} not found during sync`,
    );
    expect(getPlayerById).toHaveBeenCalled();
  });
  it("only updates ratings for tracked characters", async () => {
    getTrackedCharacters.mockResolvedValue(["SO"]);
    getPlayerById.mockResolvedValue({
      id: playerId,
      name: "player-1",
      ratings: [
        { char_short: "SO", character: "Sol", rating: 1600 },
        { char_short: "KY", character: "Ky", rating: 1500 },
      ],
    });

    await syncPlayerRatings(guildId, leaderboardName, playerId);

    expect(upsertPlayer).toHaveBeenCalledWith(playerId, "player-1");
    expect(updatePlayerRating).toHaveBeenCalledWith(guildId, leaderboardName, playerId, "SO", 1600);
    expect(updatePlayerRating).toHaveBeenCalledOnce();
  });
});
describe("syncLeaderboardRatings", async () => {
  const guildId = "guild-1";
  const leaderboardName = "board";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    getTrackedCharacters.mockResolvedValue(["SO"]);
    getPlayerById.mockImplementation((id: string) => {
      return Promise.resolve({
        id,
        name: `player-${id}`,
        ratings: [{ char_short: "SO", character: "Sol", rating: 1500 }],
      });
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it("batches 5 at a time and waits between batches", async () => {
    const playerIds = Array.from({ length: 6 }, (_, i) => `p${i}`);

    const resultsPromise = syncLeaderboardRatings(guildId, leaderboardName, playerIds);

    await vi.advanceTimersByTimeAsync(0);

    expect(getPlayerById).toHaveBeenCalledTimes(5);

    await vi.advanceTimersByTimeAsync(999);

    expect(getPlayerById).toHaveBeenCalledTimes(5);

    await vi.advanceTimersByTimeAsync(1);

    expect(getPlayerById).toHaveBeenCalledTimes(6);

    const results = await resultsPromise;
    expect(results).toHaveLength(6);
  });
  it("doesn't let 1 failed sync take down the rest of the batch", async () => {
    getPlayerById.mockImplementation((id: string) => {
      if (id === "bad") {
        return Promise.reject("puddle.farm exploded");
      } else {
        return Promise.resolve({
          id,
          name: `player-${id}`,
          ratings: [{ char_short: "SO", character: "Sol", rating: 1500 }],
        });
      }
    });
    // suppress intentional error
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const playerIds = ["good-1", "bad", "good-2"];

    const resultsPromise = syncLeaderboardRatings(guildId, leaderboardName, playerIds);
    await vi.runAllTimersAsync();
    const results = await resultsPromise;

    expect(results).toHaveLength(3);
    expect(results.find((r) => r.playerId === "bad")?.success).toBe(false);
    expect(results.find((r) => r.playerId === "good-1")?.success).toBe(true);
    expect(results.find((r) => r.playerId === "good-2")?.success).toBe(true);

    // validate that only the intentional error was logged
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith("failed to sync bad:", "puddle.farm exploded");
  });
});
