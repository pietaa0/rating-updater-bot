import { readdir } from "node:fs/promises";
import type { BotClient } from "../client.js";

export async function loadCommands(client: BotClient) {
  const commandsDir = import.meta.dirname;
  const files = (await readdir(commandsDir)).filter((f) => f.endsWith(".js") && f !== "index.js");
  for (const file of files) {
    const { command } = await import(`./${file}`);
    if (!("data" in command && "execute" in command)) {
      console.warn(`[warn] no data or execute foundin ${file}`);
      continue;
    }
    client.commands.set(command.data.name, command);
  }
}
