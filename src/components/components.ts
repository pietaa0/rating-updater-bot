import { ButtonStyle, ContainerBuilder, SeparatorSpacingSize } from "discord.js";
import type { LeaderboardRow } from "../db/queries.js";
import { striveCharacters } from "../game-data/characters.js";
import type { puddleSearchResult } from "../puddlefarm/client.js";

export function leaderboardContainer(leaderboard: LeaderboardRow[]) {
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
    container.addTextDisplayComponents((textdisplay) =>
      textdisplay.setContent(
        `${i + 1}. ${playerRow(row.playerName, row.characterName, row.rating)}`,
      ),
    );
  }

  return container;
}

export function addPlayerContainer(players: puddleSearchResult) {
  if (players.length > 5) {
    players.length = 5;
  }
  const container = new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents((textdisplay) => textdisplay.setContent("### add a player"));

  for (const [i, row] of players.entries()) {
    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textdisplay) =>
          textdisplay.setContent(`${i + 1}. ${playerRow(row.name, row.char_long, row.rating)}`),
        )
        .setButtonAccessory((button) =>
          button.setCustomId(`${row.id}`).setLabel("add").setStyle(ButtonStyle.Primary),
        ),
    );
  }
  return container;
}

export function removePlayerContainer(leaderboard: LeaderboardRow[]) {
  const display = leaderboard.map((r) => ({
    ...r,
    characterName: striveCharacters.find((c) => c.id === r.characterId)?.name ?? r.characterId,
  }));

  const container = new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents((textdisplay) => textdisplay.setContent("### remove a player"))
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));

  for (const [i, row] of display.entries()) {
    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textdisplay) =>
          textdisplay.setContent(
            `${i + 1}. ${playerRow(row.playerName, row.characterName, row.rating)}`,
          ),
        )
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

function playerRow(name: string, character: string, rating: number) {
  return `**${name}**: **${numToRating(rating)}** on **${character}**`;
}
