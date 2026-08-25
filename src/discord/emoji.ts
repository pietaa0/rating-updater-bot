import path from "node:path";

export async function emoji(characterId: string) {
  try {
    const filePath = path.join(import.meta.dirname, "../game-data/generated-emoji.js");
    const emojiModule = await import(filePath);
    const emoji = emojiModule.characterEmoji[characterId];
    if (emoji) {
      return `<:${emoji.name}:${emoji.id}>`;
    } else {
      return "";
    }
  } catch (_) {
    return "";
  }
}
