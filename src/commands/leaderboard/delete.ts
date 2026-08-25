import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { extract } from "fuzzball";
import { deleteLeaderboard, getAllLeaderboards, leaderboardExists } from "../../db/queries.js";
import type { Command } from "../../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("deleteleaderboard")
    .setDescription("delete a leaderboard")
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

        if (query === "") {
          await interaction.respond(leaderboards.map((l) => ({ name: l.name, value: l.name })));
          return;
        }
        const fuzzed = extract(
          query,
          leaderboards.map((l) => l.name),
        )
          .sort((a, b) => b[1] - a[1])
          .map((n) => n[0]);
        await interaction.respond(fuzzed.map((n) => ({ name: n, value: n })));
        return;
      } catch (err) {
        console.error("show leaderboard autocomplete failed:", err);
        await interaction.respond([]);
      }
    }
  },
  execute: async (interaction) => {
    const name = interaction.options.getString("name", true);
    const guildId = interaction.guildId!;

    if (!(await leaderboardExists(guildId, name))) {
      await interaction.reply({
        content: `"${name}" doesn't exist`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await deleteLeaderboard(guildId, name);
    await interaction.reply(`leaderboard "${name}" has been deleted`);
  },
};
