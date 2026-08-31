import path from "node:path";

let emojiModule: { characterEmoji: Record<string, { id: string; name: string }> } | null = null;
try {
  const filePath = path.join(import.meta.dirname, "../game-data/generated-emoji.js");
  emojiModule = await import(filePath);
} catch (err) {
  if (!(err instanceof Error && "code" in err && err.code === "ERR_MODULE_NOT_FOUND")) {
    console.error(err);
  }
}

export function emoji(characterId: string) {
  const emoji = emojiModule?.characterEmoji[characterId];
  if (emoji) {
    return `<:${emoji.name}:${emoji.id}>`;
  } else {
    return "";
  }
}
