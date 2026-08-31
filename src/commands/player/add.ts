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
  addPlayerRating,
  getAllLeaderboards,
  getLeaderboardData,
  getRating,
  leaderboardExists,
  upsertPlayer,
} from "../../db/queries.js";
import { addPlayerContainer } from "../../discord/components.js";
import { striveCharacters } from "../../game-data/characters.js";
import {
  getPlayerById,
  getPlayerByName,
  type puddleSearchResult,
} from "../../puddlefarm/client.js";
import type { Command } from "../../types.js";
import { getFuzzyAutocomplete } from "../shared.logic.js";

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
      opt
        .setName("leaderboard")
        .setDescription("which leaderboard")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("character")
        .setDescription("which character")
        .setRequired(true)
        .setAutocomplete(true),
    ),

  autocomplete: async (interaction) => {
    const focused = interaction.options.getFocused(true);
    const query = focused.value.toLowerCase();

    try {
      if (focused.name === "character") {
        await interaction.respond(getFuzzyAutocomplete(query, striveCharacters));
        return;
      }

      if (focused.name === "leaderboard") {
        const leaderboards = await getAllLeaderboards(interaction.guildId);

        await interaction.respond(getFuzzyAutocomplete(query, leaderboards));
        return;
      }
    } catch (err) {
      console.error("addplayer autocomplete failed:", err);
      await interaction.respond([]);
    }
  },
  execute: async (interaction) => {
    const guildId = interaction.guildId;
    const query = interaction.options.getString("name_or_id", true);
    const leaderboardName = interaction.options.getString("leaderboard", true);
    const character = interaction.options.getString("character", true);

    const validLeaderboard = await leaderboardExists(guildId, leaderboardName);
    if (!validLeaderboard) {
      await interaction.reply({
        content: "please pick a valid leaderboard",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const leaderboard = await getLeaderboardData(guildId, leaderboardName);
    if (leaderboard.length > 24) {
      await interaction.reply({
        content: "leaderboard has 25 players, please remove some before adding more",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const validCharacter = striveCharacters.some((c) => c.name === character);
    if (!validCharacter) {
      await interaction.reply({
        content: "please pick a valid character",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const response = await interaction.deferReply({ withResponse: true });
    let data: puddleSearchResult = [];

    try {
      const direct = await getPlayerById(query);

      if (direct) {
        const rating = direct.ratings.find((r) => r.character === character);

        if (!rating) {
          await interaction.editReply(
            `${escapeMarkdown(direct.name)} doesn't have any ratings for ${character}`,
          );
          return;
        }

        if ((await getRating(guildId, leaderboardName, query, rating.char_short)).length !== 0) {
          await interaction.editReply(`player already on ${escapeMarkdown(leaderboardName)}`);
          return;
        }
        await upsertPlayer(direct.id, direct.name);
        await addPlayerRating(
          guildId,
          leaderboardName,
          direct.id,
          rating.char_short,
          rating.rating,
        );
        await interaction.editReply(
          `added ${escapeMarkdown(direct.name)} to ${escapeMarkdown(leaderboardName)}`,
        );
        return;
      }
      const search = await getPlayerByName(query);

      if (!search || search.length === 0) {
        await interaction.editReply(`couldn't find any player "${escapeMarkdown(query)}"`);
        return;
      }

      data = search.filter((r) => r.char_long === character);
      if (data.length > 0) {
        const container = addPlayerContainer(data);
        await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.editReply(
          `couldn't find any player "${escapeMarkdown(query)}" who plays ${character}`,
        );
        return;
      }
    } catch (err) {
      console.error("failed to resolve player rating", err);
      await interaction.editReply("failed to reach puddle.farm, please try again later");
      return;
    }

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
        console.error("addplayer's confirmation wasn't button");
        await confirmation?.editReply({
          components: [new TextDisplayBuilder().setContent(`something went wrong`)],
        });
        return;
      }

      const id = confirmation.customId;
      const player = data.find((d) => d.id === id);

      if (player === undefined) {
        console.error("addplayers' id disappeared");
        await confirmation?.editReply({
          components: [new TextDisplayBuilder().setContent(`something went wrong`)],
        });
        return;
      }

      if ((await getRating(guildId, leaderboardName, player.id, player.char_short)).length !== 0) {
        await confirmation.editReply({
          components: [
            new TextDisplayBuilder().setContent(
              `player's ${player.char_long} already on leaderboard`,
            ),
          ],
        });
        return;
      }

      await upsertPlayer(player.id, player.name);
      await addPlayerRating(guildId, leaderboardName, player.id, player.char_short, player.rating);
      await confirmation.editReply({
        components: [
          new TextDisplayBuilder().setContent(
            `successfully added ${escapeMarkdown(player.name)}'s ${player.char_long} to ${escapeMarkdown(leaderboardName)}`,
          ),
        ],
      });

      return;
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
      console.error("error:", err);
      await interaction.editReply({
        components: [new TextDisplayBuilder().setContent(`something went wrong`)],
      });
      return;
    }
  },
};
