import "dotenv/config";
import path from "node:path";
import { REST, Routes } from "discord.js";
import { findCommandFiles } from "../commands/index.js";
import type { Command } from "../types.js";

enum CommandScope {
  Guild = "guild",
  Global = "global",
}
function getCommandScope(scope: string) {
  if (scope === "guild") {
    return CommandScope.Guild;
  }
  if (scope === "global") {
    return CommandScope.Global;
  }
  throw new Error("please set a valid command scope: guild/global");
}

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const scope = getCommandScope(process.env.COMMAND_SCOPE!);

if (!token || !clientId || (!guildId && scope === CommandScope.Guild)) {
  throw new Error("Missing DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID in .env");
}

const commandsDir = path.join(import.meta.dirname, "../commands");
const files = await findCommandFiles(commandsDir, ".ts");

const commands = [];
for (const file of files) {
  const { command }: { command: Command } = await import(file);
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(token);
let data: unknown;
if (scope === CommandScope.Guild) {
  data = await rest.put(Routes.applicationGuildCommands(clientId, guildId!), { body: commands });
  console.log(`Loaded ${(data as unknown[]).length} commands to guild succesfully!`);
}
if (scope === CommandScope.Global) {
  data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log(`Loaded ${(data as unknown[]).length} commands globally and succesfully!`);
}
