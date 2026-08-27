import { MessageFlags, SlashCommandBuilder, TextDisplayBuilder } from "discord.js";
import {
  getAllLeaderboards,
  getLeaderboardData,
  getStalePlayers,
  leaderboardExists,
} from "../../db/queries.js";
import { leaderboardContainer } from "../../discord/components.js";
import { SYNC_STALENESS_MS, syncLeaderboardRatings } from "../../lib/sync.js";
import type { Command } from "../../types.js";
import { getFuzzyAutocomplete } from "../shared.logic.js";

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
        const leaderboards = await getAllLeaderboards(interaction.guildId);
        await interaction.respond(getFuzzyAutocomplete(query, leaderboards));
        return;
      } catch (err) {
        console.error("show leaderboard autocomplete failed:", err);
        await interaction.respond([]);
      }
    }
  },

  execute: async (interaction) => {
    const guildId = interaction.guildId;
    const leaderboardname = interaction.options.getString("name", true);

    if (!(await leaderboardExists(guildId, leaderboardname))) {
      await interaction.reply(`${leaderboardname} doesn't exist`);
      return;
    }

    const stalePlayers = await getStalePlayers(guildId, leaderboardname, SYNC_STALENESS_MS);

    if (stalePlayers.length > 0) {
      await interaction.reply({
        components: [new TextDisplayBuilder().setContent("syncing database...")],
        flags: MessageFlags.IsComponentsV2,
      });

      const results = await syncLeaderboardRatings(guildId, leaderboardname, stalePlayers);
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        console.warn(`${failed.length}/${results.length} syncs failed`, failed);
      }
    } else {
      await interaction.deferReply();
    }

    const rows = await getLeaderboardData(guildId, leaderboardname);

    if (rows.length === 0) {
      await interaction.editReply(`${leaderboardname} is empty`);
      return;
    }

    const leaderboard = await leaderboardContainer(rows);

    await interaction.editReply({ components: [leaderboard], flags: MessageFlags.IsComponentsV2 });
  },
};
