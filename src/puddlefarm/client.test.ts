import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", mockFetch);

import { BASE_SLEEP_MS, getPlayerById, getPlayerByName, SLEEP_JITTER } from "./client.js";

function calculateDelay(retries: number, base = BASE_SLEEP_MS, jitter = SLEEP_JITTER) {
  // deterministic jitter (max delay)
  // will overshoot actual sleep time slightly by design
  let delay = 0;
  const baseWithJitter = base + base * jitter;
  for (let i = 0; i < retries; i++) {
    delay += baseWithJitter * 2 ** i;
  }
  return delay;
}
describe("puddle.farm client", () => {
  const playerById = {
    id: "123",
    name: "player-1",
    ratings: [{ char_short: "SO", character: "Sol", rating: 1500 }],
  };
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getPlayerById", () => {
    it("returns null on 404 and 400", async () => {
      mockFetch
        .mockResolvedValueOnce({ status: 404, ok: false })
        .mockResolvedValueOnce({ status: 400, ok: false });

      const result404 = await getPlayerById("123");
      const result400 = await getPlayerById("123");

      expect(result404).toBeNull;
      expect(result400).toBeNull;
    });
    it("returns parsed player data on 200", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(playerById),
      });

      const result = await getPlayerById("123");

      expect(result).toEqual(playerById);
      expect(mockFetch).toHaveBeenCalledOnce;
      expect(mockFetch).toHaveBeenCalledWith(
        "https://puddle.farm/api/player/123",
        expect.anything(),
      );
    });
    it("retries on 500, then succeeds", async () => {
      mockFetch.mockResolvedValueOnce({ status: 500, ok: false }).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(playerById),
      });

      const resultsPromise = getPlayerById("123");

      expect(mockFetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(calculateDelay(1));

      const result = await resultsPromise;

      expect(result).toEqual(playerById);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    it("gives up after max retries", async () => {
      mockFetch.mockResolvedValue({ status: 500, ok: false });
      const resultsPromise = getPlayerById("123");
      const rejectionAssertion = expect(resultsPromise).rejects.toThrow("puddle.farm returned 500");

      await vi.runAllTimersAsync();

      await rejectionAssertion;

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
    it("does not retry on 404", async () => {
      mockFetch.mockResolvedValue({ status: 404, ok: false });

      const result = await getPlayerById("123");

      expect(result).toBeNull;
      expect(mockFetch).toHaveBeenCalledOnce;
    });
    it("retries on network error, then succeeds", async () => {
      mockFetch.mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(playerById),
      });

      const resultsPromise = getPlayerById("123");

      await vi.advanceTimersByTimeAsync(calculateDelay(1));

      const result = await resultsPromise;

      expect(result).toEqual(playerById);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
  describe("getPlayerByName", () => {
    const playerByName = {
      id: "123",
      char_long: "Sol",
      char_short: "SO",
      name: "player-1",
      rating: 1500,
    };
    it("returns null when no results", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [] }),
      });

      const result = await getPlayerByName("non-existant player");

      expect(result).toBeNull;
      expect(mockFetch).toHaveBeenCalledOnce;
    });
    it("returns search results on 200", async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({ results: [playerByName] }),
      });

      const result = await getPlayerByName("player-1");

      expect(result).toEqual([playerByName]);
      expect(mockFetch).toHaveBeenCalledOnce;
    });
  });
});
