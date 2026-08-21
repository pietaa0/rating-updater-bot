import { Client, Collection, GatewayIntentBits } from "discord.js";
import type { Command } from "./types.js";

export class BotClient extends Client {
  commands = new Collection<string, Command>();
}

export const client = new BotClient({
  intents: [GatewayIntentBits.Guilds],
});
