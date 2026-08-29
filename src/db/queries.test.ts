import path from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { striveCharacters } from "../game-data/characters.js";
import { db, setTestDb } from "./index.js";
import {
  addPlayerRating,
  createLeaderboard,
  deleteLeaderboard,
  getAllLeaderboards,
  getLeaderboardData,
  getRating,
  getStalePlayers,
  getTrackedCharacters,
  leaderboardExists,
  removeLeaderboardEntry,
  updatePlayerRating,
  upsertPlayer,
} from "./queries.ts";
import { characters } from "./schema.js";

async function createInMemoryDb() {
  const testDb = drizzle(":memory:");

  await migrate(testDb, {
    migrationsFolder: path.join(import.meta.dirname, "../../drizzle"),
  });

  setTestDb(testDb);
  return testDb;
}

describe("queries.ts", async () => {
  const guildId = "guild-123";
  const otherGuildId = "guild-456";
  const leaderboardName = "test-board";
  const otherLeaderboardName = "test-board-2";
  const playerId = "12345";
  const otherPlayerId = "67890";
  const playerName = "player-1";
  const otherPlayerName = "player-2";
  const characterId = "SO";
  const otherCharacterId = "KY";
  const lowRating = 1500;
  const highRating = 2000;
  const thresholdMs = 20 * 1000 * 60;

  beforeEach(async () => {
    await createInMemoryDb();
    // static seed data
    await db.insert(characters).values(striveCharacters);
  });
  describe("basic leaderboard functions", async () => {
    it("createLeaderboard + leaderboardExists", async () => {
      // leaderboard doesnt exist at first
      expect(await leaderboardExists(guildId, leaderboardName)).toBe(false);

      await createLeaderboard(guildId, leaderboardName);
      // but does after getting made
      expect(await leaderboardExists(guildId, leaderboardName)).toBe(true);
    });
    it("leaderboardExists is guild scoped", async () => {
      await createLeaderboard(otherGuildId, leaderboardName);
      expect(await leaderboardExists(guildId, leaderboardName)).toBe(false);
    });
    it("getAllLeaderboards is guild scoped", async () => {
      await createLeaderboard(guildId, "a");
      await createLeaderboard(guildId, "b");
      await createLeaderboard(otherGuildId, "c");

      const rows = await getAllLeaderboards(guildId);
      expect(rows.map((r) => ({ guildId: r.guildId, name: r.name }))).toEqual([
        { guildId, name: "a" },
        { guildId, name: "b" },
      ]);
    });
    it("deleteLeaderboard deletes the leaderboard and cascades to ratings", async () => {
      await createLeaderboard(guildId, leaderboardName);
      await upsertPlayer(playerId, playerName);
      await addPlayerRating(guildId, leaderboardName, playerId, characterId, lowRating);

      await deleteLeaderboard(guildId, leaderboardName);

      expect(await leaderboardExists(guildId, leaderboardName)).toEqual(false);

      const playerRating = await getRating(guildId, leaderboardName, playerId, characterId);
      expect(playerRating).toHaveLength(0);
    });
    it("deleteLeaderboard only deletes the matching name/guild pair", async () => {
      await createLeaderboard(guildId, leaderboardName);
      await createLeaderboard(guildId, otherLeaderboardName);
      await createLeaderboard(otherGuildId, leaderboardName);

      await deleteLeaderboard(guildId, leaderboardName);

      expect(await leaderboardExists(guildId, leaderboardName)).toBe(false);
      expect(await leaderboardExists(guildId, otherLeaderboardName)).toBe(true);
      expect(await leaderboardExists(otherGuildId, leaderboardName)).toBe(true);
    });
  });
  describe("players and ratings", async () => {
    beforeEach(async () => {
      await createLeaderboard(guildId, leaderboardName);
      await upsertPlayer(playerId, playerName);
    });
    it("upsertplayer inserts then updates name on conflict", async () => {
      await upsertPlayer(playerId, otherPlayerName);
      await addPlayerRating(guildId, leaderboardName, playerId, characterId, lowRating);

      const rows = await getLeaderboardData(guildId, leaderboardName);

      expect(rows).toHaveLength(1);
      expect(rows[0].playerName).toBe(otherPlayerName);
    });
    it("addPlayerRatings updates ratings instead of creating duplicate entries", async () => {
      await addPlayerRating(guildId, leaderboardName, playerId, characterId, lowRating);
      await addPlayerRating(guildId, leaderboardName, playerId, characterId, highRating);
      const rows = await getLeaderboardData(guildId, leaderboardName);
      expect(rows).toHaveLength(1);
      expect(rows[0].rating).toBe(highRating);
    });
    it("addPlayerRatings can create two entries for two different characters", async () => {
      await addPlayerRating(guildId, leaderboardName, playerId, characterId, lowRating);
      await addPlayerRating(guildId, leaderboardName, playerId, otherCharacterId, lowRating);

      const rows = await getLeaderboardData(guildId, leaderboardName);

      expect(rows).toHaveLength(2);
    });
    it("getRating returns an empty array when player doesn't exist", async () => {
      const rows = await getRating(guildId, leaderboardName, otherPlayerId, characterId);
      expect(rows).toEqual([]);
    });
    it("getLeaderboardData orders rating by descending", async () => {
      await upsertPlayer(otherPlayerId, playerName);
      await addPlayerRating(guildId, leaderboardName, playerId, characterId, lowRating);
      await addPlayerRating(guildId, leaderboardName, otherPlayerId, otherCharacterId, highRating);

      const rows = await getLeaderboardData(guildId, leaderboardName);
      expect(rows[0].rating).toBeGreaterThan(rows[1].rating);
    });
    it("getLeaderboardData does not leak from another board", async () => {
      await createLeaderboard(guildId, otherLeaderboardName);
      await createLeaderboard(otherGuildId, leaderboardName);

      await addPlayerRating(guildId, leaderboardName, playerId, characterId, lowRating);
      await addPlayerRating(guildId, otherLeaderboardName, playerId, otherCharacterId, lowRating);
      await addPlayerRating(otherGuildId, leaderboardName, playerId, otherCharacterId, lowRating);

      const rows = await getLeaderboardData(guildId, leaderboardName);

      expect(rows).toHaveLength(1);
      expect(rows[0].characterId).toBe(characterId);
    });
    it("getLeaderboardData correctly joins and returns player name", async () => {
      await addPlayerRating(guildId, leaderboardName, playerId, characterId, lowRating);

      const rows = await getLeaderboardData(guildId, leaderboardName);

      expect(rows[0].playerName).toBe(playerName);
    });
    it("removeLeaderboardEntry removes exactly one entry from exactly one board, then returns it", async () => {
      await createLeaderboard(otherGuildId, leaderboardName);
      await createLeaderboard(guildId, otherLeaderboardName);

      await addPlayerRating(guildId, leaderboardName, playerId, characterId, lowRating);
      await addPlayerRating(guildId, leaderboardName, playerId, otherCharacterId, lowRating);
      await addPlayerRating(guildId, otherLeaderboardName, playerId, characterId, lowRating);
      await addPlayerRating(otherGuildId, leaderboardName, playerId, characterId, lowRating);

      await removeLeaderboardEntry(guildId, leaderboardName, playerId, characterId);

      const rows = await getLeaderboardData(guildId, leaderboardName);

      expect(rows).toHaveLength(1);
      expect(rows[0].characterId).toBe(otherCharacterId);
      expect(await getLeaderboardData(guildId, otherLeaderboardName)).toHaveLength(1);
      expect(await getLeaderboardData(otherGuildId, leaderboardName)).toHaveLength(1);
    });

    it("removeLeaderboardEntry throws on missing args", async () => {
      await addPlayerRating(guildId, leaderboardName, playerId, characterId, lowRating);

      await expect(
        removeLeaderboardEntry("", leaderboardName, playerId, characterId),
      ).rejects.toThrow("removeLeaderboardEntry called with missing args");
      await expect(removeLeaderboardEntry(guildId, "", playerId, characterId)).rejects.toThrow(
        "removeLeaderboardEntry called with missing args",
      );
      await expect(
        removeLeaderboardEntry(guildId, leaderboardName, "", characterId),
      ).rejects.toThrow("removeLeaderboardEntry called with missing args");
      await expect(removeLeaderboardEntry(guildId, leaderboardName, playerId, "")).rejects.toThrow(
        "removeLeaderboardEntry called with missing args",
      );

      const rows = await getLeaderboardData(guildId, leaderboardName);
      expect(rows).toHaveLength(1);
    });
    it("getTrackedCharacters only returns characters for that specific board", async () => {
      await createLeaderboard(guildId, otherLeaderboardName);
      await createLeaderboard(otherGuildId, leaderboardName);
      await addPlayerRating(guildId, leaderboardName, playerId, characterId, lowRating);
      await addPlayerRating(guildId, otherLeaderboardName, playerId, otherCharacterId, lowRating);
      await addPlayerRating(otherGuildId, leaderboardName, playerId, otherCharacterId, lowRating);

      const characters = await getTrackedCharacters(guildId, leaderboardName, playerId);

      expect(characters).toHaveLength(1);
      expect(characters[0]).toBe(characterId);
    });
  });
  describe("time dependant behaviour", async () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      await createLeaderboard(guildId, leaderboardName);
      await upsertPlayer(playerId, playerName);
      await addPlayerRating(guildId, leaderboardName, playerId, characterId, lowRating);
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    it("getStalePlayers only returns players older than (and not equal to) the threshold", async () => {
      const fresh = await getStalePlayers(guildId, leaderboardName, thresholdMs);
      expect(fresh).toEqual([]);

      vi.advanceTimersByTime(thresholdMs);

      // 1 ms before stale

      const almostStale = await getStalePlayers(guildId, leaderboardName, thresholdMs);
      expect(almostStale).toEqual([]);

      // add new player and new tracked character

      await upsertPlayer(otherPlayerId, otherPlayerName);
      await addPlayerRating(guildId, leaderboardName, otherPlayerId, characterId, lowRating);
      await addPlayerRating(guildId, leaderboardName, playerId, otherCharacterId, lowRating);

      vi.advanceTimersByTime(1);

      // only 1 is stale

      const firstStale = await getStalePlayers(guildId, leaderboardName, thresholdMs);
      expect(firstStale).toHaveLength(1);

      vi.advanceTimersByTime(thresholdMs);

      // 3 entries, 2 players, both stale

      const bothStale = await getStalePlayers(guildId, leaderboardName, thresholdMs);
      expect(bothStale).toHaveLength(2);
    });
    it("getStalePlayers is guild and board scoped", async () => {
      await createLeaderboard(guildId, otherLeaderboardName);
      await createLeaderboard(otherGuildId, leaderboardName);
      await upsertPlayer(otherPlayerId, otherPlayerName);
      await addPlayerRating(guildId, otherLeaderboardName, otherPlayerId, characterId, lowRating);
      await addPlayerRating(otherGuildId, leaderboardName, otherPlayerId, characterId, lowRating);

      vi.advanceTimersByTime(thresholdMs + 1);

      const stale = await getStalePlayers(guildId, leaderboardName, thresholdMs);

      expect(stale).toHaveLength(1);
      expect(stale[0]).toBe(playerId);
    });
    it("updatePlayerRating updates both rating and updatedAt", async () => {
      vi.advanceTimersByTime(thresholdMs + 1);
      const stale = await getStalePlayers(guildId, leaderboardName, thresholdMs);
      expect(stale).toHaveLength(1);
      await updatePlayerRating(guildId, leaderboardName, playerId, characterId, highRating);
      const player = await getLeaderboardData(guildId, leaderboardName);
      expect(player).toHaveLength(1);
      expect(player[0].rating).toBe(highRating);
      expect(await getStalePlayers(guildId, leaderboardName, thresholdMs)).toHaveLength(0);
    });
  });
});
