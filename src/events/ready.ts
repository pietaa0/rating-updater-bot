import { Events, type Client } from "discord.js";

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client<true>) {
  console.log(`logged in as ${client.user.tag}`);
}
