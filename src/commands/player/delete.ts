import {
  DiscordjsError,
  DiscordjsErrorCodes,
  escapeMarkdown,
  type MessageComponentInteraction,
  MessageFlags,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";
import {
  getAllLeaderboards,
  getLeaderboardData,
  leaderboardExists,
  removeLeaderboardEntry,
} from "../../db/queries.js";
import { removePlayerContainer } from "../../discord/components.js";
import type { Command } from "../../types.js";
import { getFuzzyAutocomplete } from "../shared.logic.js";
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("removeplayer")
    .setDescription("remove players from the leaderboard")
    .addStringOption((opt) =>
      opt
        .setName("leaderboard")
        .setDescription("which leaderboard")
        .setRequired(true)
        .setAutocomplete(true),
    ),
  autocomplete: async (interaction) => {
    const focused = interaction.options.getFocused(true);
    const query = focused.value.toLowerCase();
    try {
      if (focused.name === "leaderboard") {
        const leaderboards = await getAllLeaderboards(interaction.guildId);
        await interaction.respond(getFuzzyAutocomplete(query, leaderboards));
        return;
      }
    } catch (err) {
      console.error("removeplayer autocomplete failed:", err);
      await interaction.respond([]);
    }
  },

  execute: async (interaction) => {
    const guildId = interaction.guildId;
    const leaderboardName = interaction.options.getString("leaderboard", true);
    const validLeaderboard = await leaderboardExists(guildId, leaderboardName);
    if (!validLeaderboard) {
      await interaction.reply({
        content: "please pick a valid leaderboard",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const leaderboard = await getLeaderboardData(guildId, leaderboardName);
    if (leaderboard.length === 0) {
      await interaction.reply({
        content: `there are no players on ${escapeMarkdown(leaderboardName)}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const response = await interaction.deferReply({ withResponse: true });

    const container = await removePlayerContainer(leaderboard);

    await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    const collectorFilter = (i: MessageComponentInteraction) => {
      if (i.user.id !== interaction.user.id) {
        i.reply({ content: "this isn't your menu", flags: MessageFlags.Ephemeral });
        return false;
      }
      return true;
    };

    try {
      const confirmation = await response.resource?.message?.awaitMessageComponent({
        filter: collectorFilter,
        time: 300_000,
      });

      await confirmation?.deferUpdate();
      if (!confirmation?.isButton()) {
        await confirmation?.editReply({
          components: [new TextDisplayBuilder().setContent(`something went wrong`)],
        });
        console.error("removeplayer's confirmation wasn't button");
        return;
      }

      const [playerId, characterId] = confirmation.customId.split(":");

      if (!playerId || !characterId) {
        console.error(`removeplayer had playerId ${playerId} and characterId ${characterId}`);
        await confirmation.editReply({
          components: [new TextDisplayBuilder().setContent(`button customId was malformed`)],
        });
        return;
      }

      await removeLeaderboardEntry(guildId, leaderboardName, playerId, characterId);

      await confirmation.editReply({
        components: [
          new TextDisplayBuilder().setContent(`successfully removed player from leaderboard`),
        ],
      });
    } catch (err) {
      if (
        err instanceof DiscordjsError &&
        err.code === DiscordjsErrorCodes.InteractionCollectorError
      ) {
        await interaction.editReply({
          components: [new TextDisplayBuilder().setContent("timed out")],
        });
        return;
      }
      console.error("removePlayer componentCollector failed:", err);
      await interaction.editReply({
        components: [new TextDisplayBuilder().setContent("something went wrong")],
      });
    }
  },
};
