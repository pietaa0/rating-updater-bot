import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { leaderboardContainer } from "../../components/components.js";
import { getAllLeaderboards, getLeaderboardData, leaderboardExists } from "../../db/queries.js";
import type { Command } from "../../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("display a leaderboard")
    .addStringOption((opt) =>
      opt
        .setName("name")
        .setDescription("name of the leaderboard")
        .setRequired(true)
        .setAutocomplete(true),
    ),

  autocomplete: async (interaction) => {
    const focused = interaction.options.getFocused(true);
    const query = focused.value.toLowerCase();

    if (focused.name === "name") {
      try {
        const leaderboards = await getAllLeaderboards(interaction.guildId!);
        const matches = leaderboards.filter((l) => l.name.toLowerCase().includes(query));
        await interaction.respond(matches.map((l) => ({ name: l.name, value: l.name })));
        return;
      } catch (err) {
        console.error("show leaderboard autocomplete failed:", err);
        await interaction.respond([]);
      }
    }
  },

  execute: async (interaction) => {
    const guildId = interaction.guildId!;
    const leaderboardname = interaction.options.getString("name", true);

    if (!(await leaderboardExists(guildId, leaderboardname))) {
      interaction.reply(`${leaderboardname} doesn't exist`);
      return;
    }

    const rows = await getLeaderboardData(guildId, leaderboardname);

    if (rows.length === 0) {
      interaction.reply(`${leaderboardname} is empty`);
      return;
    }

    const leaderboard = leaderboardContainer(rows);

    interaction.reply({ components: [leaderboard], flags: MessageFlags.IsComponentsV2 });
  },
};
