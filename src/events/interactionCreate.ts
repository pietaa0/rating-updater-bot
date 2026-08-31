import { Events, type Interaction, MessageFlags } from "discord.js";
import type { BotClient } from "../client.js";

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  const client = interaction.client as BotClient;

  if (interaction.isAutocomplete()) {
    if (!interaction.inGuild()) {
      await interaction.respond([]);
      return;
    }
    const command = client.commands.get(interaction.commandName);
    if (command?.autocomplete) await command.autocomplete(interaction);
    return;
  }

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    if (!interaction.inGuild()) {
      await interaction.reply("i only work in servers");
      return;
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(
        `command failed: /${interaction.commandName}`,
        { userId: interaction.user.id, guildId: interaction.guildId },
        err,
      );
      const reply = { content: `Something went wrong`, flags: MessageFlags.Ephemeral as const };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
      return;
    }
  }
}
