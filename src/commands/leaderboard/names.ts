import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { getAllLeaderboards } from "../../db/queries.js";
import type { Command } from "../../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("showallleaderboards")
    .setDescription("show the names of all leaderboards"),
  execute: async (interaction) => {
    const guildId = interaction.guildId!;
    const leaderboards = await getAllLeaderboards(guildId);

    if (leaderboards.length === 0) {
      await interaction.reply({
        content: "this server has no leaderboards, create one using /addleaderboard",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    let content = "the following leaderboard(s) exist:\n";
    for (const row of leaderboards) {
      content += `${row.name}\n`;
    }
    await interaction.reply(content);
  },
};
