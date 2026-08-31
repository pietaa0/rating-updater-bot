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
  return await buildPlayerContainer(
    display[0]?.leaderboardName ?? "unkown title",
    display,
    (d) => ({ name: d.playerName, characterName: d.characterName, rating: d.rating }),
  );
}

export async function addPlayerContainer(search: puddleSearchResult) {
  const players = search.slice(0, 5);

  return await buildPlayerContainer(
    "add a player",
    players,
    (p) => ({ name: p.name, characterName: p.char_long, rating: p.rating }),
    (p) => ({ label: "add", customId: p.id }),
  );
}

export async function removePlayerContainer(leaderboard: LeaderboardRow[]) {
  const display = leaderboard.map((r) => ({
    ...r,
    characterName: striveCharacters.find((c) => c.id === r.characterId)?.name ?? r.characterId,
  }));
  return await buildPlayerContainer(
    "remove a player",
    display,
    (d) => ({ name: d.playerName, characterName: d.characterName, rating: d.rating }),
    (d) => ({ label: "remove", customId: `${d.playerId}:${d.characterId}` }),
  );
}
interface ContainerRow {
  name: string;
  characterName: string;
  rating: number;
}
interface ButtonConf {
  label: string;
  customId: string;
}

export async function buildPlayerContainer<T>(
  title: string,
  items: T[],
  toRow: (item: T) => ContainerRow,
  toButton?: (item: T) => ButtonConf,
) {
  const container = new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents((t) => t.setContent(`### ${title}`))
    .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Small));

  for (const [i, item] of items.entries()) {
    const row = toRow(item);
    const player = await playerRow(row.name, row.characterName, row.rating);
    const line = `${i + 1}. ${player}`;

    if (toButton) {
      const button = toButton(item);
      container.addSectionComponents((s) =>
        s
          .addTextDisplayComponents((t) => t.setContent(line))
          .setButtonAccessory((b) =>
            b.setLabel(button.label).setCustomId(button.customId).setStyle(ButtonStyle.Primary),
          ),
      );
    } else {
      container.addTextDisplayComponents((t) => t.setContent(line));
    }
  }
  return container;
}

function numToRating(rating: number) {
  if (rating < 10000000) {
    // ratings above 10,000,000 correspond to DR
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
