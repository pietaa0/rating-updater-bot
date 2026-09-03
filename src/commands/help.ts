import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";

export const command: Command = {
  data: new SlashCommandBuilder().setName("help").setDescription("get descriptions of commands"),
  execute: async (interaction) => {
    await interaction.reply(
      "**Bot Commands**\n\n* `/ping`\nHealth check; replies `pong`.\n* `/addleaderboard <name>`\nCreate a leaderboard (max 10 per guild).\n* `/deleteleaderboard <name>`\nDelete a leaderboard.\n* `/showallleaderboards`\nList all leaderboards in the current guild.\n* `/leaderboard <name>`\nDisplay a leaderboard; auto-syncs stale ratings first.\n* `/addplayer <name_or_id> <leaderboard> <character>`\nAdd a player's rating (by name or puddle.farm id).\n* `/removeplayer <leaderboard>`\nRemove a player via an interactive menu.\n* `/help`\nShow this message.",
    );
  },
};
