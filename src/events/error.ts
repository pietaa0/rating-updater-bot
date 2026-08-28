import { Events } from "discord.js";

export const name = Events.Error;

export function execute(error: Error) {
  console.error("client error:", error);
}
