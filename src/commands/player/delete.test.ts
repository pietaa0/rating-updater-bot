import { MessageFlags, TextDisplayBuilder } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addPlayerRating,
  createLeaderboard,
  getLeaderboardData,
  upsertPlayer,
} from "../../db/queries.js";
import {
  makeMockButtonConfirmation,
  rejectCollectorWithTimeout,
  resolveCollectorWith,
} from "../../test/mock-collector.js";
import { createInMemoryDb } from "../../test/mock-db.js";
import { makeMockInteraction } from "../../test/mock-interaction.js";
import { command } from "./delete.js";

const { removePlayerContainer } = vi.hoisted(() => ({
  removePlayerContainer: vi.fn(),
}));
vi.mock("../../discord/components.js", () => ({
  removePlayerContainer,
}));

describe("player/delete.ts", () => {
  const guildId = "guild-1";
  const leaderboard = "board-1";
  const playerId = "p123";
  const playerName = "player-1";
  const characterId = "SO";
  const mockInteractionOpts = { guildId, strings: { leaderboard } };
  beforeEach(async () => {
    vi.clearAllMocks();
    await createInMemoryDb();
    await createLeaderboard(guildId, leaderboard);
  });
  it("console.errors on a malformed custom id", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await upsertPlayer(playerId, playerName);
    await addPlayerRating(guildId, leaderboard, playerId, characterId, 1500);

    const interaction = makeMockInteraction(mockInteractionOpts);
    const confirmation = makeMockButtonConfirmation("malformed");
    resolveCollectorWith(interaction, confirmation);

    await command.execute(interaction);

    expect(confirmation.editReply).toHaveBeenCalledWith({
      components: [new TextDisplayBuilder().setContent(`button customId was malformed`)],
    });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      `removeplayer had playerId malformed and characterId undefined`,
    );
    const rows = await getLeaderboardData(guildId, leaderboard);
    expect(rows).toHaveLength(1);
    expect(rows[0].playerId).toBe(playerId);
  });
  it("show's 'timed out' and does not remove the entry when the collector times out", async () => {
    await upsertPlayer(playerId, playerName);
    await addPlayerRating(guildId, leaderboard, playerId, characterId, 1500);

    const interaction = makeMockInteraction(mockInteractionOpts);
    rejectCollectorWithTimeout(interaction);

    await command.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith({
      components: [new TextDisplayBuilder().setContent("timed out")],
    });

    const rows = await getLeaderboardData(guildId, leaderboard);
    expect(rows).toHaveLength(1);
  });
  it("errors and replies 'something went wrong' on other errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await upsertPlayer(playerId, playerName);
    await addPlayerRating(guildId, leaderboard, playerId, characterId, 1500);
    const error = new Error("different error");

    const interaction = makeMockInteraction(mockInteractionOpts);
    interaction.collectorHandle.awaitMessageComponent.mockRejectedValue(error);
    await command.execute(interaction);

    expect(errorSpy).toHaveBeenCalledWith("removePlayer componentCollector failed:", error);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(interaction.editReply).toHaveBeenCalledWith({
      components: [new TextDisplayBuilder().setContent("something went wrong")],
    });
    const rows = await getLeaderboardData(guildId, leaderboard);
    expect(rows).toHaveLength(1);
  });
  it("returns early when leaderboard doesn't exist", async () => {
    const interaction = makeMockInteraction({
      guildId,
      strings: { leaderboard: "fake leaderboard" },
    });
    await command.execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "please pick a valid leaderboard",
      flags: MessageFlags.Ephemeral,
    });
    expect(interaction.deferReply).not.toHaveBeenCalled();
  });
  it("returns early when leaderboard is empty", async () => {
    const interaction = makeMockInteraction(mockInteractionOpts);
    await command.execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: `there are no players on ${leaderboard}`,
      flags: MessageFlags.Ephemeral,
    });
    expect(interaction.deferReply).not.toHaveBeenCalled();
  });
  it("deletes the player entry when everything is valid and the button is pressed", async () => {
    await upsertPlayer(playerId, playerName);
    await upsertPlayer("player-2", playerName);
    await addPlayerRating(guildId, leaderboard, playerId, characterId, 1500);
    await addPlayerRating(guildId, leaderboard, "player-2", characterId, 1600);
    await addPlayerRating(guildId, leaderboard, playerId, "KY", 1700);

    const interaction = makeMockInteraction(mockInteractionOpts);
    const confirmation = makeMockButtonConfirmation(`${playerId}:${characterId}`);
    resolveCollectorWith(interaction, confirmation);

    await command.execute(interaction);

    const rows = await getLeaderboardData(guildId, leaderboard);
    expect(rows).toHaveLength(2);
    const remaining = rows.map((r) => ({ playerId: r.playerId, characterId: r.characterId }));
    expect(remaining).toContainEqual({ playerId, characterId: "KY" });
    expect(remaining).toContainEqual({ playerId: "player-2", characterId });
    expect(confirmation.editReply).toHaveBeenCalledWith({
      components: [
        new TextDisplayBuilder().setContent(`successfully removed player from leaderboard`),
      ],
    });
  });
});
