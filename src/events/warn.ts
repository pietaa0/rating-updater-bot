import { Events } from "discord.js";

export const name = Events.Warn;

export function execute(message: string) {
  console.warn("client warn:", message);
}
