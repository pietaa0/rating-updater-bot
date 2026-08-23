import { Events, type Interaction, MessageFlags } from "discord.js";
import type { BotClient } from "../client.js";

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  const client = interaction.client as BotClient;

  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (command?.autocomplete) await command.autocomplete(interaction);
    return;
  }

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const reply = { content: "?", flags: MessageFlags.Ephemeral as const };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
      return;
    }
  }
}
