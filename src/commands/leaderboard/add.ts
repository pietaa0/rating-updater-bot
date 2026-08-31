import { escapeMarkdown, MessageFlags, SlashCommandBuilder } from "discord.js";
import { createLeaderboard, getAllLeaderboards, leaderboardExists } from "../../db/queries.js";
import type { Command } from "../../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("addleaderboard")
    .setDescription("create a leaderboard")
    .addStringOption((opt) =>
      opt.setName("name").setDescription("name of the leaderboard").setRequired(true),
    ),
  execute: async (interaction) => {
    const name = interaction.options.getString("name", true);
    const guildId = interaction.guildId;

    if (name.length > 100) {
      await interaction.reply({
        content: `please choose a name under 100 characters long`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (await leaderboardExists(guildId, name)) {
      await interaction.reply({
        content: `"${escapeMarkdown(name)}" already exists`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const leaderboards = await getAllLeaderboards(guildId);
    if (leaderboards.length > 9) {
      await interaction.reply({
        content: "10 other leaderboards already exist, please delete one before creating another",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await createLeaderboard(guildId, name);
    await interaction.reply(`created leaderboard "${escapeMarkdown(name)}"`);
  },
};
