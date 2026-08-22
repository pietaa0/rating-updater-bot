import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("addplayer")
    .setDescription("add a player to the leaderboard")
    .addStringOption((opt) =>
      opt
        .setName("name_or_id")
        .setDescription("the name or id of the player you want to add")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("leaderboard").setDescription("which leaderboard").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("character").setDescription("which character").setRequired(true),
    ),
  execute: async (interaction) => {
    await interaction.reply("pong");
  },
};
