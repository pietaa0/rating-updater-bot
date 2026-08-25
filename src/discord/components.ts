import { ButtonStyle, ContainerBuilder, SeparatorSpacingSize } from "discord.js";
import type { LeaderboardRow } from "../db/queries.js";
import { striveCharacters } from "../game-data/characters.js";
import type { puddleSearchResult } from "../puddlefarm/client.js";
import { emoji } from "./emoji.js";

export async function leaderboardContainer(leaderboard: LeaderboardRow[]) {
  const display = leaderboard.map((r) => ({
    ...r,
    characterName: striveCharacters.find((c) => c.id === r.characterId)?.name ?? r.characterId,
  }));

  const container = new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents((textdisplay) =>
      textdisplay.setContent(`### ${display[0]?.leaderboardName ?? "unknown title"}`),
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));

  for (const [i, row] of display.entries()) {
    const player = await playerRow(row.playerName, row.characterName, row.rating);
    container.addTextDisplayComponents((textdisplay) =>
      textdisplay.setContent(`${i + 1}. ${player}`),
    );
  }

  return container;
}

export async function addPlayerContainer(search: puddleSearchResult) {
  const players = search.slice(0, 5);

  const container = new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents((textdisplay) => textdisplay.setContent("### add a player"));

  for (const [i, row] of players.entries()) {
    const player = await playerRow(row.name, row.char_long, row.rating);
    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textdisplay) => textdisplay.setContent(`${i + 1}. ${player}`))
        .setButtonAccessory((button) =>
          button.setCustomId(`${row.id}`).setLabel("add").setStyle(ButtonStyle.Primary),
        ),
    );
  }
  return container;
}

export async function removePlayerContainer(leaderboard: LeaderboardRow[]) {
  const display = leaderboard.map((r) => ({
    ...r,
    characterName: striveCharacters.find((c) => c.id === r.characterId)?.name ?? r.characterId,
  }));

  const container = new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents((textdisplay) => textdisplay.setContent("### remove a player"))
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));

  for (const [i, row] of display.entries()) {
    const player = await playerRow(row.playerName, row.characterName, row.rating);
    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textdisplay) => textdisplay.setContent(`${i + 1}. ${player}`))
        .setButtonAccessory((button) =>
          button
            .setCustomId(`${row.playerId}:${row.characterId}`)
            .setLabel("remove")
            .setStyle(ButtonStyle.Primary),
        ),
    );
  }

  return container;
}

function numToRating(rating: number) {
  if (rating < 10000000) {
    return `${rating} RP`;
  } else {
    return `${rating - 10000000} DR`;
  }
}

async function playerRow(name: string, character: string, rating: number) {
  const characterId = striveCharacters.find((c) => c.name === character)?.id;
  const characterEmoji = characterId ? await emoji(characterId) : "";
  return `**${name}**: **${numToRating(rating)}** on ${characterEmoji}**${character}**`;
}
