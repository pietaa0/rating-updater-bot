import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addPlayerRating,
  createLeaderboard,
  getLeaderboardData,
  upsertPlayer,
} from "../../db/queries.js";
import { striveCharacters } from "../../game-data/characters.js";
import {
  makeMockButtonConfirmation,
  rejectCollectorWithTimeout,
  resolveCollectorWith,
} from "../../test/mock-collector.js";
import { createInMemoryDb } from "../../test/mock-db.js";
import { makeMockInteraction } from "../../test/mock-interaction.js";
import { command } from "./add.js";

const { addPlayerContainer } = vi.hoisted(() => ({
  addPlayerContainer: vi.fn(),
}));
vi.mock("../../discord/components.js", () => ({
  addPlayerContainer,
}));
const { getPlayerById, getPlayerByName } = vi.hoisted(() => ({
  getPlayerById: vi.fn(),
  getPlayerByName: vi.fn(),
}));
vi.mock("../../puddlefarm/client.js", () => ({
  getPlayerById,
  getPlayerByName,
}));

describe("player/add.ts", () => {
  const guildId = "guild-1";
  const leaderboard = "board-1";
  const playerId = "player-123";
  const playerName = "player-1";
  const characterId = "SO";
  const characterName = "Sol";
  const mockInteractionOptsById = {
    guildId,
    strings: { name_or_id: playerId, leaderboard, character: characterName },
  };
  const mockInteractionOptsByName = {
    guildId,
    strings: { name_or_id: playerName, leaderboard, character: characterName },
  };
  beforeEach(async () => {
    vi.clearAllMocks();
    await createInMemoryDb();
    await createLeaderboard(guildId, leaderboard);
  });
  describe("by id", () => {
    it("allows at most 25 entries to be added to a leaderboard", async () => {
      await upsertPlayer(playerId, playerName);
      getPlayerById.mockResolvedValueOnce({
        id: playerId,
        name: playerName,
        ratings: [
          {
            rating: 1500,
            char_short: striveCharacters[25].id,
            character: striveCharacters[25].name,
          },
        ],
      });
      await Promise.all(
        striveCharacters.slice(0, 24).map((c) => {
          return addPlayerRating(guildId, leaderboard, playerId, c.id, 1500);
        }),
      );
      const succesfulInteraction = makeMockInteraction({
        guildId,
        strings: { name_or_id: playerId, leaderboard, character: striveCharacters[25].name },
      });

      await command.execute(succesfulInteraction);

      const firstRows = await getLeaderboardData(guildId, leaderboard);

      expect(firstRows).toHaveLength(25);

      const failedInteraction = makeMockInteraction({
        guildId,
        strings: { name_or_id: playerId, leaderboard, character: striveCharacters[26].name },
      });

      await command.execute(failedInteraction);

      const secondRows = await getLeaderboardData(guildId, leaderboard);

      expect(secondRows).toHaveLength(25);
      expect(failedInteraction.reply).toHaveBeenCalledWith({
        content: "leaderboard has 25 players, please remove some before adding more",
        flags: MessageFlags.Ephemeral,
      });
      expect(failedInteraction.deferReply).not.toHaveBeenCalled();
      expect(getPlayerById).toHaveBeenCalledTimes(1);
    });
    it("tells the user the player has no rating on direct id hit then exits", async () => {
      getPlayerById.mockResolvedValueOnce({
        id: playerId,
        name: playerName,
        ratings: [],
      });
      const interaction = makeMockInteraction(mockInteractionOptsById);
      await command.execute(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith(
        `${playerName} doesn't have any ratings for ${characterName}`,
      );
      const rows = await getLeaderboardData(guildId, leaderboard);
      expect(rows).toHaveLength(0);
    });
    it("tells the user the player already exists on id hit and leaderboard presence then exits", async () => {
      await upsertPlayer(playerId, playerName);
      await addPlayerRating(guildId, leaderboard, playerId, characterId, 1500);
      getPlayerById.mockResolvedValueOnce({
        id: playerId,
        name: "new-name",
        ratings: [
          {
            rating: 1600,
            char_short: characterId,
            character: characterName,
          },
        ],
      });

      const interaction = makeMockInteraction(mockInteractionOptsById);

      await command.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(`player already on ${leaderboard}`);
      const rows = await getLeaderboardData(guildId, leaderboard);
      expect(rows).toHaveLength(1);
      expect(rows.map((r) => ({ name: r.playerName, rating: r.rating }))[0]).toEqual({
        name: playerName,
        rating: 1500,
      });
    });
    it("adds the player to the leaderboard by id", async () => {
      getPlayerById.mockResolvedValueOnce({
        id: playerId,
        name: playerName,
        ratings: [
          {
            rating: 1500,
            char_short: characterId,
            character: characterName,
          },
        ],
      });
      const interaction = makeMockInteraction(mockInteractionOptsById);

      await command.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(`added ${playerName} to ${leaderboard}`);
      const rows = await getLeaderboardData(guildId, leaderboard);
      expect(rows).toHaveLength(1);
      expect(
        rows.map((r) => ({
          name: r.playerName,
          id: r.playerId,
          characterId: r.characterId,
          rating: r.rating,
          leaderboard: r.leaderboardName,
        }))[0],
      ).toEqual({
        name: playerName,
        id: playerId,
        characterId,
        rating: 1500,
        leaderboard,
      });
    });
  });
  describe("by name", () => {
    it("exits early when there's no results", async () => {
      getPlayerByName.mockResolvedValueOnce(null);
      const interaction = makeMockInteraction(mockInteractionOptsByName);
      await command.execute(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith(
        `couldn't find any player "${playerName}"`,
      );
      expect(addPlayerContainer).not.toHaveBeenCalled();
    });
    it("exits early when the right character can't be found", async () => {
      getPlayerByName.mockResolvedValueOnce([
        {
          id: playerId,
          name: playerName,
          rating: 1500,
          char_short: striveCharacters[1].id,
          char_long: striveCharacters[1].name,
        },
      ]);
      const interaction = makeMockInteraction(mockInteractionOptsByName);
      await command.execute(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith(
        `couldn't find any player "${playerName}" who plays ${characterName}`,
      );
    });
    it("exits early when trying to add an existing player", async () => {
      getPlayerByName.mockResolvedValueOnce([
        {
          id: playerId,
          name: "new name",
          char_long: characterName,
          char_short: characterId,
          rating: 1500,
        },
      ]);
      addPlayerContainer.mockReturnValueOnce("player-container");
      await upsertPlayer(playerId, playerName);
      await addPlayerRating(guildId, leaderboard, playerId, characterId, 1600);
      const interaction = makeMockInteraction(mockInteractionOptsByName);
      const confirmation = makeMockButtonConfirmation(playerId);
      resolveCollectorWith(interaction, confirmation);
      await command.execute(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith({
        components: ["player-container"],
        flags: MessageFlags.IsComponentsV2,
      });
      expect(confirmation.deferUpdate).toHaveBeenCalledOnce();
      expect(confirmation.editReply).toHaveBeenCalledWith({
        components: [
          new TextDisplayBuilder().setContent(`player's ${characterName} already on leaderboard`),
        ],
      });
      const rows = await getLeaderboardData(guildId, leaderboard);
      expect(rows).toHaveLength(1);
      expect(rows.map((r) => ({ playerName: r.playerName, rating: r.rating }))[0]).toEqual({
        playerName,
        rating: 1600,
      });
    });
    it("adds a new player when the stars align", async () => {
      getPlayerByName.mockResolvedValueOnce([
        {
          id: playerId,
          name: playerName,
          char_long: characterName,
          char_short: characterId,
          rating: 1500,
        },
      ]);
      const interaction = makeMockInteraction(mockInteractionOptsByName);
      const confirmation = makeMockButtonConfirmation(playerId);
      resolveCollectorWith(interaction, confirmation);
      await command.execute(interaction);
      const rows = await getLeaderboardData(guildId, leaderboard);
      expect(rows).toHaveLength(1);
      expect(
        rows.map((r) => ({
          playerId: r.playerId,
          characterId: r.characterId,
          playerName: r.playerName,
          rating: r.rating,
        }))[0],
      ).toEqual({ playerId, characterId, playerName, rating: 1500 });
    });
    it("returns early when puddle.farm throws", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("puddle.farm exploded");
      getPlayerById.mockRejectedValueOnce(error);
      const interaction = makeMockInteraction(mockInteractionOptsByName);
      await command.execute(interaction);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("failed to resolve player rating", error);
      expect(interaction.editReply).toHaveBeenCalledWith(
        "failed to reach puddle.farm, please try again later",
      );
    });
    it("errors and replies 'something went wrong' on generic errors in collector", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("generic error");
      getPlayerByName.mockResolvedValueOnce([
        {
          id: playerId,
          name: playerName,
          char_long: characterName,
          char_short: characterId,
          rating: 1500,
        },
      ]);
      const interaction = makeMockInteraction(mockInteractionOptsByName);
      interaction.collectorHandle.awaitMessageComponent.mockRejectedValue(error);
      await command.execute(interaction);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("error:", error);
      expect(interaction.editReply).toHaveBeenCalledWith({
        components: [new TextDisplayBuilder().setContent("something went wrong")],
      });
      const rows = await getLeaderboardData(guildId, leaderboard);
      expect(rows).toHaveLength(0);
    });
    it("doesn't error and replies 'timed out' on timeout", async () => {
      getPlayerByName.mockResolvedValueOnce([
        {
          id: playerId,
          name: playerName,
          char_long: characterName,
          char_short: characterId,
          rating: 1500,
        },
      ]);
      const interaction = makeMockInteraction(mockInteractionOptsByName);
      rejectCollectorWithTimeout(interaction);
      await command.execute(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith({
        components: [new TextDisplayBuilder().setContent("timed out")],
      });
      const rows = await getLeaderboardData(guildId, leaderboard);
      expect(rows).toHaveLength(0);
    });
  });
});
