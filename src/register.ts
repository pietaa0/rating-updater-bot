import "dotenv/config";

import { readdir } from "node:fs/promises";
import path from "node:path";
import { REST, Routes } from "discord.js";
import type { Command } from "./types.js";

const token = process.env.DISCORD_TOKEN;
const clientID = process.env.DISCORD_CLIENT_ID;
const guildID = process.env.DISCORD_GUILD_ID;

if (!token || !clientID || !guildID) {
  throw new Error("Missing DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID in .env");
}

const commandsDir = path.join(import.meta.dirname, "./commands");

const files = (await readdir(commandsDir)).filter((f) => f.endsWith(".ts") && f !== "index.ts");

const commands = [];
for (const file of files) {
  const { command }: { command: Command } = await import(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(token);
const data = await rest.put(Routes.applicationGuildCommands(clientID, guildID), { body: commands });

console.log(`Loaded ${(data as unknown[]).length} commands succesfully!`);
