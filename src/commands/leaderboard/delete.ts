import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { deleteLeaderboard, leaderboardExists } from "../../db/queries.js";
import type { Command } from "../../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("deleteleaderboard")
    .setDescription("delete a leaderboard")
    .addStringOption((opt) =>
      opt.setName("name").setDescription("name of the leaderboard").setRequired(true),
    ),
  execute: async (interaction) => {
    const name = interaction.options.getString("name", true);
    const guildId = interaction.guildId!;

    if (!(await leaderboardExists(guildId, name))) {
      interaction.reply({ content: `"${name}" doesn't exist`, flags: MessageFlags.Ephemeral });
      return;
    }
    await deleteLeaderboard(guildId, name);
    await interaction.reply(`leaderboard "${name}" has been deleted`);
  },
};
