import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";

export const command: Command = {
  data: new SlashCommandBuilder().setName("ping").setDescription("responds with pong if online"),
  execute: async (interaction) => {
    await interaction.reply("pong");
  },
};
