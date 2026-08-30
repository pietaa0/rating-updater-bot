import { MessageFlags } from "discord.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createLeaderboard, getAllLeaderboards } from "../../db/queries.js";
import { createInMemoryDb } from "../../test/mock-db.js";
import { makeMockInteraction } from "../../test/mock-interaction.js";
import { command } from "./add.js";

describe("leaderboard/add.ts", () => {
  const guildId = "guild-1";
  beforeEach(async () => {
    await createInMemoryDb();
  });

  it("doesn't create leaderboard when 10 exist", async () => {
    const boards = Array.from({ length: 9 }, (_, i) => `board-${i}`);
    await Promise.all(boards.map((b) => createLeaderboard(guildId, b)));

    // verify leaderboards have been made
    expect(await getAllLeaderboards(guildId)).toHaveLength(9);
    // make tenth
    await command.execute(makeMockInteraction({ guildId, strings: { name: "board-10" } }));
    expect(await getAllLeaderboards(guildId)).toHaveLength(10);
    const interaction = makeMockInteraction({ guildId, strings: { name: "board-11" } });
    // fail to make eleventh
    await command.execute(interaction);
    const names = (await getAllLeaderboards(guildId)).map((b) => b.name);
    expect(names).toContain("board-10");
    expect(names).not.toContain("board-11");
    expect(names).toHaveLength(10);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "10 other leaderboards already exist, please delete one before creating another",
      flags: MessageFlags.Ephemeral,
    });
  });
});
