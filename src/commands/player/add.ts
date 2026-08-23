import {
  type MessageComponentInteraction,
  MessageFlags,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { addPlayerContainer } from "../../components/components.js";
import {
  addPlayerRating,
  getAllLeaderboards,
  getLeaderboardData,
  getRating,
  leaderboardExists,
  upsertPlayer,
} from "../../db/queries.js";
import { striveCharacters } from "../../game-data/characters.js";
import { getPlayerById, getPlayerByName } from "../../puddlefarm/client.js";
import type { Command } from "../../types.js";

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
        const matches = striveCharacters.filter((c) => c.name.toLowerCase().includes(query));
        await interaction.respond(
          matches.slice(0, 25).map((c) => ({ name: c.name, value: c.name })),
        );
        return;
      }

      if (focused.name === "leaderboard") {
        const leaderboards = await getAllLeaderboards(interaction.guildId!);
        const matches = leaderboards.filter((l) => l.name.toLowerCase().includes(query));
        await interaction.respond(matches.map((l) => ({ name: l.name, value: l.name })));
        return;
      }
    } catch (err) {
      console.error("addplayer autocomplete failed:", err);
      await interaction.respond([]);
    }
  },
  execute: async (interaction) => {
    const guildId = interaction.guildId!;
    const query = interaction.options.getString("name_or_id", true);
    const leaderboardName = interaction.options.getString("leaderboard", true);
    const character = interaction.options.getString("character", true);

    const validLeaderboard = await leaderboardExists(guildId, leaderboardName);
    if (!validLeaderboard) {
      interaction.reply({
        content: "please pick a valid leaderboard",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const leaderboard = await getLeaderboardData(guildId, leaderboardName);

    if (leaderboard.length > 24) {
      interaction.reply({
        content: "leaderboard has 25 players, please remove some before adding more",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const validCharacter = striveCharacters.some((c) => c.name === character);
    if (!validCharacter) {
      interaction.reply({
        content: "please pick a valid character",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const response = await interaction.deferReply({ withResponse: true });
    let data = [];

    try {
      const direct = await getPlayerById(query);

      if (direct) {
        const rating = direct.ratings.find((r) => r.character === character);

        if (!rating) {
          interaction.editReply(`${direct.name} doesn't have any ratings for ${character}`);
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
        interaction.editReply(`added ${direct.name} to ${leaderboardName}`);
        return;
      }
      const search = await getPlayerByName(query);

      if (!search) {
        interaction.editReply(`couldn't find any player "${query}"`);
        return;
      }

      data = search.filter((r) => r.char_long === character);
      if (data.length > 0) {
        const container = addPlayerContainer(data);
        interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } else {
        interaction.editReply(`couldn't find any player "${query}"`);
        return;
      }
    } catch (err) {
      console.error("failed to resolve player rating", err);
      interaction.editReply("failed to reach puddle.farm, please try again later");
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
        time: 60_000,
      });

      if (!confirmation?.isButton()) {
        console.error("addplayer's confirmation wasn't button");
        return;
      }

      await confirmation.deferUpdate();
      const id = confirmation.customId;
      const player = data.find((d) => d.id === id);

      if (player === undefined) {
        console.error("addplayers' id disappeared");
        return;
      }

      if ((await getRating(guildId, leaderboardName, player.id, player.char_short)).length !== 0) {
        await confirmation.editReply({
          components: [
            new TextDisplayBuilder().setContent(
              `${player.name}'s ${player.char_long} already on leaderboard`,
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
            `successfully added ${player.name}'s ${player.char_long} to ${leaderboardName}`,
          ),
        ],
      });

      return;
    } catch (_) {
      await interaction.editReply({
        components: [new TextDisplayBuilder().setContent("timed out")],
      });
      return;
    }
  },
};
