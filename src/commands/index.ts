import { readdir } from "node:fs/promises";
import type { BotClient } from "../client.js";

export async function findCommandFiles(commandsDir: string, extension: string): Promise<string[]> {
  const entries = await readdir(commandsDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === `index${extension}`) continue;

    if (entry.isDirectory()) {
      const subfiles = await readdir(`${commandsDir}/${entry.name}`);
      for (const f of subfiles.filter((f) => f.endsWith(extension))) {
        files.push(`${commandsDir}/${entry.name}/${f}`);
      }
    } else if (entry.name.endsWith(extension)) {
      files.push(`${commandsDir}/${entry.name}`);
    }
  }
  return files;
}

export async function loadCommands(client: BotClient) {
  const commandsDir = import.meta.dirname;
  const files = await findCommandFiles(commandsDir, ".js");

  for (const file of files) {
    const { command } = await import(file);
    if (!("data" in command && "execute" in command)) {
      console.warn(`[warn] no data or execute foundin ${file}`);
      continue;
    }
    client.commands.set(command.data.name, command);
  }
}
