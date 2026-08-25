import { characterEmoji } from "../game-data/generated-emoji.js";

export function emoji(characterId: string) {
  const emoji = characterEmoji[characterId];
  if (emoji) {
    return `<:${emoji.name}:${emoji.id}>`;
  } else {
    return "";
  }
}
